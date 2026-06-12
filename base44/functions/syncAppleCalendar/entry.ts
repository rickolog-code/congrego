import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Apple Calendar events via CalDAV.
 * Credentials are stored on CircleMember so re-syncs work without re-entering them.
 * Recurring events: fetches all events (no time-range filter) to capture RRULE masters,
 * then expands recurrences into individual occurrences within the next 60 days.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let { appleId, appPassword } = body;

    // If called without credentials (re-sync on app open), load stored credentials
    if (!appleId || !appPassword) {
      const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
      const member = memberships?.find(m => m.apple_id && m.apple_app_password);
      if (!member) {
        return Response.json({ error: 'No stored Apple credentials. Please connect Apple Calendar first.' }, { status: 400 });
      }
      appleId = member.apple_id;
      appPassword = member.apple_app_password;
    }

    const credentials = btoa(`${appleId}:${appPassword}`);
    const authHeader = `Basic ${credentials}`;

    const ICLOUD_CALDAV = 'https://caldav.icloud.com';

    async function caldavRequest(url, method, depth, body) {
      const headers = {
        Authorization: authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'Congrego/1.0',
      };
      if (depth !== null) headers['Depth'] = String(depth);
      const res = await fetch(url, { method, headers, body, redirect: 'follow' });
      return res;
    }

    // Step 1: Find the principal URL
    const wellKnownRes = await caldavRequest(
      `${ICLOUD_CALDAV}/.well-known/caldav`,
      'PROPFIND', 0,
      `<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>`
    );

    if (wellKnownRes.status === 401) {
      return Response.json({
        error: 'Wrong Apple ID or app-specific password. Use an app-specific password from appleid.apple.com → Security → App-Specific Passwords.',
      }, { status: 401 });
    }

    const realBase = new URL(wellKnownRes.url).origin;
    const wellKnownText = await wellKnownRes.text();

    let principalPath = extractHrefFromTag(wellKnownText, 'current-user-principal');
    if (!principalPath) {
      const hrefMatch = wellKnownText.match(/<[Hh]ref>([^<]+)<\/[Hh]ref>/);
      principalPath = hrefMatch ? hrefMatch[1].trim() : null;
    }
    if (!principalPath) {
      return Response.json({ error: 'Could not find iCloud principal. Check your Apple ID.' }, { status: 400 });
    }

    const principalUrl = toAbsolute(principalPath, realBase);

    // Step 2: Get calendar-home-set
    const homeRes = await caldavRequest(principalUrl, 'PROPFIND', 0,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`
    );
    const homeText = await homeRes.text();

    let homePath = extractHrefFromTag(homeText, 'calendar-home-set');
    if (!homePath) {
      const m = homeText.match(/<[Hh]ref>([^<]*calendars[^<]*)<\/[Hh]ref>/);
      homePath = m ? m[1].trim() : null;
    }
    if (!homePath) {
      return Response.json({ error: 'Could not locate iCloud calendar home.' }, { status: 400 });
    }

    const homeUrl = toAbsolute(homePath, realBase);

    // Step 3: List calendars
    const calListRes = await caldavRequest(homeUrl, 'PROPFIND', 1,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <C:supported-calendar-component-set/>
  </D:prop>
</D:propfind>`
    );
    const calListText = await calListRes.text();

    const calendarUrls = [];
    const responseBlocks = splitResponses(calListText);

    for (const block of responseBlocks) {
      const href = extractFirstHref(block);
      if (!href) continue;
      const absHref = toAbsolute(href, realBase);
      if (absHref === homeUrl || absHref === homeUrl + '/') continue;
      const isCalendar = /calendar/i.test(block) && /collection/i.test(block);
      if (!isCalendar) continue;
      const supportsVEVENT = !block.includes('VTODO') || block.includes('VEVENT');
      if (!supportsVEVENT) continue;
      calendarUrls.push(absHref);
    }

    if (calendarUrls.length === 0) {
      return Response.json({ error: 'No calendars found in this iCloud account.' }, { status: 400 });
    }

    // Step 4: Fetch ALL events (no time-range filter so recurring masters are included)
    // Then expand them into occurrences within the next 60 days.
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const allEvents = []; // { uid, summary, eventDate, eventTime, description, location }

    for (const calUrl of calendarUrls) {
      const reportRes = await caldavRequest(calUrl, 'REPORT', 1,
        `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`
      );

      if (!reportRes.ok) continue;
      const reportText = await reportRes.text();
      const icsBlocks = extractIcsBlocks(reportText);

      for (const ics of icsBlocks) {
        const parsed = parseVEvents(ics, now, windowEnd);
        for (const ev of parsed) allEvents.push(ev);
      }
    }

    // Step 5: Save to all circles
    const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'You are not a member of any circle yet.' }, { status: 400 });
    }

    let totalNew = 0, totalUpdated = 0;
    const incomingUids = new Set(allEvents.map(ev => ev.uid));

    for (const membership of memberships) {
      // Store credentials on first real sync (when appleId/appPassword were passed in body)
      if (body.appleId && body.appPassword) {
        await base44.asServiceRole.entities.CircleMember.update(membership.id, {
          calendar_synced: true,
          calendar_provider: 'apple',
          apple_id: appleId,
          apple_app_password: appPassword,
        });
      }

      // Delete any previously synced apple events whose UID is no longer in the window
      // (handles deleted or rescheduled events)
      const existingApple = await base44.asServiceRole.entities.CalendarEvent.filter({
        circle_id: membership.circle_id,
        creator_email: user.email,
        event_type: 'event',
      });
      for (const existing of existingApple) {
        if (existing.title?.startsWith('[apple:') && existing.external_uid && !incomingUids.has(existing.external_uid)) {
          await base44.asServiceRole.entities.CalendarEvent.delete(existing.id);
        }
      }

      for (const ev of allEvents) {
        const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
          circle_id: membership.circle_id,
          creator_email: user.email,
          external_uid: ev.uid,
        });

        if (existing && existing.length > 0) {
          // Delete any extra duplicates
          for (let i = 1; i < existing.length; i++) {
            await base44.asServiceRole.entities.CalendarEvent.delete(existing[i].id);
          }
          await base44.asServiceRole.entities.CalendarEvent.update(existing[0].id, {
            title: `[apple:${ev.uid}] ${ev.summary}`,
            event_date: ev.eventDate,
            event_time: ev.eventTime || null,
            description: ev.description || '',
            location: ev.location || '',
          });
          totalUpdated++;
        } else {
          await base44.asServiceRole.entities.CalendarEvent.create({
            circle_id: membership.circle_id,
            title: `[apple:${ev.uid}] ${ev.summary}`,
            external_uid: ev.uid,
            description: ev.description || '',
            event_date: ev.eventDate,
            event_time: ev.eventTime || null,
            location: ev.location || '',
            creator_email: user.email,
            creator_name: membership.username || user.full_name || user.email.split('@')[0],
            event_type: 'event',
          });
          totalNew++;
        }
      }
    }

    return Response.json({
      message: 'Apple Calendar sync complete',
      newEvents: totalNew,
      updatedEvents: totalUpdated,
      calendarsScanned: calendarUrls.length,
      eventsFound: allEvents.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ---- Helpers ----

function toAbsolute(path, base) {
  if (!path) return base;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return new URL(base).origin + path;
  return base.replace(/\/$/, '') + '/' + path;
}

function extractHrefFromTag(xml, tagName) {
  const tagRe = new RegExp(`<[^>]*:?${tagName}[^>]*>[\\s\\S]*?<[^>]*[Hh]ref[^>]*>([^<]+)<\\/[^>]*[Hh]ref>`, 'i');
  const m = xml.match(tagRe);
  return m ? m[1].trim() : null;
}

function extractFirstHref(block) {
  const m = block.match(/<[^>]*[Hh]ref[^>]*>([^<]+)<\/[^>]*[Hh]ref>/);
  return m ? m[1].trim() : null;
}

function splitResponses(xml) {
  const blocks = [];
  const re = /<[^>]*:?response[^>]*>([\s\S]*?)<\/[^>]*:?response>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

function extractIcsBlocks(xml) {
  const blocks = [];
  const cdataRe = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let m;
  while ((m = cdataRe.exec(xml)) !== null) {
    const val = m[1].trim();
    if (val.includes('BEGIN:VCALENDAR')) blocks.push(val);
  }
  if (blocks.length > 0) return blocks;

  const calDataRe = /<[^>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^>]*:?calendar-data>/gi;
  while ((m = calDataRe.exec(xml)) !== null) {
    const val = m[1].trim();
    if (val.includes('BEGIN:VCALENDAR') || val.includes('BEGIN:VEVENT')) blocks.push(val);
  }
  if (blocks.length > 0) return blocks;

  const rawRe = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g;
  while ((m = rawRe.exec(xml)) !== null) {
    blocks.push(m[0]);
  }
  return blocks;
}

/**
 * Parse one ICS block and return all occurrences within [windowStart, windowEnd].
 * Handles single events and simple RRULE (DAILY, WEEKLY, MONTHLY, YEARLY) recurrences.
 */
function parseVEvents(ics, windowStart, windowEnd) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const results = [];

  // Find all VEVENT blocks (an ICS may have multiple)
  const veventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let vm;
  while ((vm = veventRe.exec(unfolded)) !== null) {
    const vevent = vm[1];

    const uid = getProp(vevent, 'UID');
    const summary = getProp(vevent, 'SUMMARY') || 'Busy';
    const description = getProp(vevent, 'DESCRIPTION') || '';
    const location = getProp(vevent, 'LOCATION') || '';
    const dtProp = getPropWithParams(vevent, 'DTSTART');
    const rrule = getProp(vevent, 'RRULE');

    if (!dtProp || !uid) continue;

    const { eventDate, eventTime, dtStartMs } = parseDtstart(dtProp);
    if (!eventDate || dtStartMs === null) continue;

    if (!rrule) {
      // Single event — include if within window
      const evDate = new Date(eventDate + 'T00:00:00');
      if (evDate >= new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate()) &&
          evDate <= windowEnd) {
        results.push({ uid, summary, eventDate, eventTime, description, location });
      }
      continue;
    }

    // Recurring event — expand within window
    const occurrences = expandRRule(rrule, dtStartMs, eventTime, windowStart, windowEnd);
    for (let i = 0; i < occurrences.length; i++) {
      const occ = occurrences[i];
      // Use uid__N for each occurrence so each gets its own stable key
      results.push({
        uid: i === 0 ? uid : `${uid}__${i}`,
        summary,
        eventDate: occ.eventDate,
        eventTime: occ.eventTime,
        description,
        location,
      });
    }
  }

  return results;
}

/**
 * Expand a simple RRULE into occurrences within [windowStart, windowEnd].
 * Supports FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with optional INTERVAL, COUNT, UNTIL, BYDAY.
 */
function expandRRule(rrule, dtStartMs, eventTime, windowStart, windowEnd) {
  const params = {};
  rrule.split(';').forEach(part => {
    const [k, v] = part.split('=');
    if (k && v) params[k.toUpperCase()] = v.toUpperCase();
  });

  const freq = params['FREQ'];
  const interval = parseInt(params['INTERVAL'] || '1', 10);
  const count = params['COUNT'] ? parseInt(params['COUNT'], 10) : null;
  let until = null;
  if (params['UNTIL']) {
    const u = params['UNTIL'];
    until = new Date(`${u.slice(0,4)}-${u.slice(4,6)}-${u.slice(6,8)}T00:00:00Z`);
  }

  // BYDAY for WEEKLY: e.g. "MO,WE,FR"
  const byDayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byDay = params['BYDAY']
    ? params['BYDAY'].split(',').map(d => byDayMap[d.replace(/[^A-Z]/g, '')]).filter(d => d !== undefined)
    : null;

  const results = [];
  let current = new Date(dtStartMs);
  let iterations = 0;
  const maxIterations = 500; // safety cap

  while (iterations < maxIterations) {
    iterations++;

    // Stop conditions
    if (until && current > until) break;
    if (count !== null && results.length >= count) break;
    if (current > windowEnd) break;

    if (current >= windowStart) {
      if (byDay && freq === 'WEEKLY') {
        // For WEEKLY with BYDAY, emit each matching day in the current week
        const weekStart = new Date(current);
        weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Sunday
        for (const dow of byDay) {
          const day = new Date(weekStart);
          day.setUTCDate(weekStart.getUTCDate() + dow);
          if (day >= windowStart && day <= windowEnd) {
            results.push({
              eventDate: formatDate(day),
              eventTime,
            });
          }
        }
      } else {
        results.push({ eventDate: formatDate(current), eventTime });
      }
    }

    // Advance by frequency
    if (freq === 'DAILY') {
      current = new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
    } else if (freq === 'WEEKLY') {
      current = new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    } else if (freq === 'MONTHLY') {
      current = new Date(current);
      current.setUTCMonth(current.getUTCMonth() + interval);
    } else if (freq === 'YEARLY') {
      current = new Date(current);
      current.setUTCFullYear(current.getUTCFullYear() + interval);
    } else {
      break; // unsupported frequency
    }
  }

  return results;
}

function formatDate(d) {
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function getProp(vevent, name) {
  const m = vevent.match(new RegExp(`^${name}:(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

function getPropWithParams(vevent, name) {
  const m = vevent.match(new RegExp(`^${name}((?:;[^:]*)?):(\\S+)$`, 'm'));
  if (!m) return null;
  const params = m[1];
  const value = m[2].trim();
  const tzidMatch = params.match(/TZID=([^;]+)/i);
  const tzid = tzidMatch ? tzidMatch[1].trim() : null;
  const isUtc = value.endsWith('Z');
  return { value, tzid, isUtc };
}

function parseDtstart(dtProp) {
  const raw = typeof dtProp === 'string' ? dtProp : dtProp.value;
  const isUtc = typeof dtProp === 'object' ? dtProp.isUtc : raw.endsWith('Z');

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    const eventDate = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
    return { eventDate, eventTime: null, dtStartMs: new Date(eventDate + 'T00:00:00Z').getTime() };
  }

  const dtMatch = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/);
  if (!dtMatch) return { eventDate: null, eventTime: null, dtStartMs: null };

  const [, yr, mo, dy, hh, mm] = dtMatch;

  if (isUtc) {
    const dtStartMs = new Date(`${yr}-${mo}-${dy}T${hh}:${mm}:00Z`).getTime();
    const d = new Date(dtStartMs);
    const localHr = d.getUTCHours();
    const localMin = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm = localHr >= 12 ? 'PM' : 'AM';
    const h12 = localHr % 12 || 12;
    return {
      eventDate: formatDate(d),
      eventTime: `${h12}:${localMin} ${ampm}`,
      dtStartMs,
    };
  }

  // Floating / TZID — treat wall-clock date literally
  const hour = parseInt(hh, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return {
    eventDate: `${yr}-${mo}-${dy}`,
    eventTime: `${h12}:${mm} ${ampm}`,
    dtStartMs: new Date(`${yr}-${mo}-${dy}T${hh}:${mm}:00Z`).getTime(),
  };
}
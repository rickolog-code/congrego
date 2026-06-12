import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Apple Calendar events via CalDAV.
 * Uses the correct iCloud CalDAV endpoints and robust ICS parsing.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { appleId, appPassword } = await req.json();
    if (!appleId || !appPassword) {
      return Response.json({ error: 'appleId and appPassword are required' }, { status: 400 });
    }

    const credentials = btoa(`${appleId}:${appPassword}`);
    const authHeader = `Basic ${credentials}`;

    // iCloud CalDAV base — always use this, it handles redirects
    const ICLOUD_CALDAV = 'https://caldav.icloud.com';

    // Helper: make a CalDAV request
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

    // Step 1: Find the principal URL using well-known endpoint
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

    // Extract principal path
    let principalPath = extractHrefFromTag(wellKnownText, 'current-user-principal');
    if (!principalPath) {
      // iCloud principal path is typically /[shortname]/principal/
      // Try extracting from any href in the response
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
      // Try direct href extraction near "calendars"
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

    // Split into per-response blocks
    const calendarUrls = [];
    const responseBlocks = splitResponses(calListText);

    for (const block of responseBlocks) {
      const href = extractFirstHref(block);
      if (!href) continue;
      const absHref = toAbsolute(href, realBase);
      if (absHref === homeUrl || absHref === homeUrl + '/') continue;

      // Must have <calendar/> resource type
      const isCalendar = /calendar/i.test(block) && /collection/i.test(block);
      if (!isCalendar) continue;

      // Skip if it only supports VTODO (task list) with no VEVENT
      const supportsVEVENT = !block.includes('VTODO') || block.includes('VEVENT');
      if (!supportsVEVENT) continue;

      calendarUrls.push(absHref);
    }

    if (calendarUrls.length === 0) {
      return Response.json({ error: 'No calendars found in this iCloud account.' }, { status: 400 });
    }

    // Step 4: Fetch events from each calendar (next 60 days)
    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const fmtDt = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    const allEvents = [];

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
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmtDt(now)}" end="${fmtDt(in60Days)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`
      );

      if (!reportRes.ok) continue;
      const reportText = await reportRes.text();

      // Extract all ICS blocks from the XML response
      // calendar-data content might be inside CDATA or plain text
      const icsBlocks = extractIcsBlocks(reportText);

      for (const ics of icsBlocks) {
        const parsed = parseVEvent(ics);
        if (parsed) allEvents.push(parsed);
      }
    }

    // Step 5: Save to all circles
    const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'You are not a member of any circle yet.' }, { status: 400 });
    }

    let totalNew = 0, totalUpdated = 0;

    for (const membership of memberships) {
      for (const ev of allEvents) {
        const appleTitle = `[apple:${ev.uid}] ${ev.summary}`;
        const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
          circle_id: membership.circle_id,
          creator_email: user.email,
          title: appleTitle,
        });

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.CalendarEvent.update(existing[0].id, {
            event_date: ev.eventDate,
            event_time: ev.eventTime || null,
            description: ev.description || '',
            location: ev.location || '',
          });
          totalUpdated++;
        } else {
          await base44.asServiceRole.entities.CalendarEvent.create({
            circle_id: membership.circle_id,
            title: appleTitle,
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

      await base44.asServiceRole.entities.CircleMember.update(membership.id, {
        calendar_synced: true,
        calendar_provider: 'apple',
      });
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

// Extract the first <href> inside a named tag (handles namespaced tags)
function extractHrefFromTag(xml, tagName) {
  // Match the tag (with optional namespace prefix) and extract its href child
  const tagRe = new RegExp(`<[^>]*:?${tagName}[^>]*>[\\s\\S]*?<[^>]*[Hh]ref[^>]*>([^<]+)<\\/[^>]*[Hh]ref>`, 'i');
  const m = xml.match(tagRe);
  return m ? m[1].trim() : null;
}

function extractFirstHref(block) {
  const m = block.match(/<[^>]*[Hh]ref[^>]*>([^<]+)<\/[^>]*[Hh]ref>/);
  return m ? m[1].trim() : null;
}

// Split XML into per-<response> blocks
function splitResponses(xml) {
  const blocks = [];
  const re = /<[^>]*:?response[^>]*>([\s\S]*?)<\/[^>]*:?response>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

// Extract all ICS text blocks from a CalDAV REPORT response
function extractIcsBlocks(xml) {
  const blocks = [];
  // Try CDATA first
  const cdataRe = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let m;
  while ((m = cdataRe.exec(xml)) !== null) {
    const val = m[1].trim();
    if (val.includes('BEGIN:VCALENDAR')) blocks.push(val);
  }
  if (blocks.length > 0) return blocks;

  // Plain text inside calendar-data tags
  const calDataRe = /<[^>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^>]*:?calendar-data>/gi;
  while ((m = calDataRe.exec(xml)) !== null) {
    const val = m[1].trim();
    if (val.includes('BEGIN:VCALENDAR') || val.includes('BEGIN:VEVENT')) blocks.push(val);
  }
  if (blocks.length > 0) return blocks;

  // Fallback: grab any raw VCALENDAR blocks
  const rawRe = /BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g;
  while ((m = rawRe.exec(xml)) !== null) {
    blocks.push(m[0]);
  }
  return blocks;
}

// Parse a single ICS text block into an event object
function parseVEvent(ics) {
  // Unfold iCal line continuations (CRLF or LF followed by whitespace)
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');

  const veventMatch = unfolded.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
  if (!veventMatch) return null;
  const vevent = veventMatch[1];

  const uid = getProp(vevent, 'UID');
  const summary = getProp(vevent, 'SUMMARY') || 'Busy';
  const dtstart = getPropWithParams(vevent, 'DTSTART');
  const description = getProp(vevent, 'DESCRIPTION') || '';
  const location = getProp(vevent, 'LOCATION') || '';

  if (!dtstart || !uid) return null;

  const { eventDate, eventTime } = parseDtstart(dtstart);
  if (!eventDate) return null;

  return { uid, summary, eventDate, eventTime, description, location };
}

// Get a simple property value (no parameters)
function getProp(vevent, name) {
  const m = vevent.match(new RegExp(`^${name}:(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

// Get property value even when it has parameters like DTSTART;TZID=...
function getPropWithParams(vevent, name) {
  const m = vevent.match(new RegExp(`^${name}(?:;[^:]*)?:(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

function parseDtstart(dtstart) {
  // Remove trailing Z for processing
  const clean = dtstart.replace(/Z$/, '').replace(/[^0-9T]/g, (c) => c === 'T' ? 'T' : '');
  // All-day: YYYYMMDD (8 chars, no T)
  if (/^\d{8}$/.test(clean)) {
    return {
      eventDate: `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`,
      eventTime: null,
    };
  }
  // DateTime: YYYYMMDDTHHMMSS
  const dtMatch = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (dtMatch) {
    const [, yr, mo, dy, hh, mm] = dtMatch;
    const hour = parseInt(hh, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return {
      eventDate: `${yr}-${mo}-${dy}`,
      eventTime: `${h12}:${mm} ${ampm}`,
    };
  }
  return { eventDate: null, eventTime: null };
}
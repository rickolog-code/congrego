import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Apple Calendar events for the authenticated user via CalDAV.
 * Expects payload: { appleId: string, appPassword: string }
 *
 * iCloud CalDAV notes:
 * - The real server is a personal subdomain like p34-caldav.icloud.com
 * - Must discover it by querying apple's well-known URL first
 * - Must use Basic auth with the app-specific password (NOT the Apple ID password)
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

    // Helper: PROPFIND request
    async function propfind(url, depth, body) {
      const res = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: String(depth),
        },
        body,
        redirect: 'follow',
      });
      return res;
    }

    // Step 1: Discover the personal CalDAV server via Apple's well-known endpoint
    // iCloud redirects /.well-known/caldav to the real subdomain (e.g. p34-caldav.icloud.com)
    const wellKnownRes = await fetch('https://caldav.icloud.com/.well-known/caldav', {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '0',
      },
      body: `<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>`,
      redirect: 'follow',
    });

    if (wellKnownRes.status === 401) {
      return Response.json({
        error: 'Wrong Apple ID or app-specific password. Make sure you are using an app-specific password from appleid.apple.com, not your regular Apple password.',
      }, { status: 401 });
    }

    // The real server URL is where the redirect landed
    const realServerUrl = new URL(wellKnownRes.url).origin;
    const wellKnownText = await wellKnownRes.text();

    // Extract principal path from response
    let principalPath = null;
    const principalMatch = wellKnownText.match(/<[^>]*current-user-principal[^>]*>[\s\S]*?<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);
    if (principalMatch) principalPath = principalMatch[1].trim();

    if (!principalPath) {
      // Fallback: try the standard path pattern for iCloud
      principalPath = `/principals/${appleId}/`;
    }

    const principalUrl = principalPath.startsWith('http')
      ? principalPath
      : `${realServerUrl}${principalPath}`;

    // Step 2: Get calendar-home-set from the principal
    const homeRes = await propfind(principalUrl, 0, `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <C:calendar-home-set/>
  </prop>
</propfind>`);

    const homeText = await homeRes.text();

    // Extract calendar home href
    const homeMatch = homeText.match(/<[^>]*href[^>]*>([^<]*calendars[^<]*)<\/[^>]*href>/i)
      || homeText.match(/<[^>]*calendar-home-set[^>]*>[\s\S]*?<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);

    if (!homeMatch) {
      return Response.json({ error: 'Could not find iCloud calendar home. Check your Apple ID email.' }, { status: 400 });
    }

    const homePath = homeMatch[1].trim();
    const homeUrl = homePath.startsWith('http') ? homePath : `${realServerUrl}${homePath}`;

    // Step 3: List all calendars in the home set
    const calListRes = await propfind(homeUrl, 1, `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <resourcetype/>
    <displayname/>
    <C:supported-calendar-component-set/>
  </prop>
</propfind>`);

    const calListText = await calListRes.text();

    // Find calendar collections (contain <calendar/> in resourcetype and support VEVENT)
    const responseBlocks = calListText.split(/<\/?response>/i).filter(b => b.includes('<href>') || b.includes('<href'));
    const calendarUrls = [];

    for (const block of responseBlocks) {
      const hrefMatch = block.match(/<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/i);
      if (!hrefMatch) continue;
      const href = hrefMatch[1].trim();
      if (href === homePath || href === homeUrl) continue;
      // Must be a calendar collection
      if (!block.includes('calendar') || !block.includes('collection')) continue;
      // Skip non-VEVENT calendars (e.g. task lists)
      if (block.includes('VTODO') && !block.includes('VEVENT')) continue;
      calendarUrls.push(href.startsWith('http') ? href : `${realServerUrl}${href}`);
    }

    if (calendarUrls.length === 0) {
      // Fallback: try any href that looks like a calendar path
      const allHrefs = [...calListText.matchAll(/<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/gi)].map(m => m[1].trim());
      for (const href of allHrefs) {
        if (href === homePath || href === homeUrl) continue;
        if (href.endsWith('/') && href.length > homePath.length) {
          const url = href.startsWith('http') ? href : `${realServerUrl}${href}`;
          if (!calendarUrls.includes(url)) calendarUrls.push(url);
        }
      }
    }

    if (calendarUrls.length === 0) {
      return Response.json({ error: 'No calendars found on this iCloud account.' }, { status: 400 });
    }

    // Step 4: Fetch events from each calendar (next 30 days)
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const allEvents = [];

    for (const calUrl of calendarUrls) {
      const reportRes = await fetch(calUrl, {
        method: 'REPORT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '1',
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
<calendar-query xmlns="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
  <D:prop>
    <D:getetag/>
    <calendar-data/>
  </D:prop>
  <filter>
    <comp-filter name="VCALENDAR">
      <comp-filter name="VEVENT">
        <time-range start="${fmt(now)}" end="${fmt(in30Days)}"/>
      </comp-filter>
    </comp-filter>
  </filter>
</calendar-query>`,
        redirect: 'follow',
      });

      if (!reportRes.ok) continue;
      const reportText = await reportRes.text();

      // Extract ICS data blocks
      const icsBlocks = reportText.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];

      for (const ics of icsBlocks) {
        // Unfold iCal line continuations
        const unfolded = ics.replace(/\r?\n[ \t]/g, '');
        const veventMatch = unfolded.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
        if (!veventMatch) continue;
        const vevent = veventMatch[1];

        const uid = (vevent.match(/^UID:(.+)$/m) || [])[1]?.trim();
        const summary = (vevent.match(/^SUMMARY:(.+)$/m) || [])[1]?.trim() || 'Busy';
        const dtstart = (vevent.match(/^DTSTART(?:;[^:]*)?:(.+)$/m) || [])[1]?.trim();
        const description = (vevent.match(/^DESCRIPTION:(.+)$/m) || [])[1]?.trim() || '';
        const location = (vevent.match(/^LOCATION:(.+)$/m) || [])[1]?.trim() || '';

        if (!dtstart || !uid) continue;

        let eventDate, eventTime = null;
        const cleanDt = dtstart.replace(/Z$/, '');

        if (cleanDt.length === 8) {
          // All-day: YYYYMMDD
          eventDate = `${cleanDt.slice(0,4)}-${cleanDt.slice(4,6)}-${cleanDt.slice(6,8)}`;
        } else if (cleanDt.length >= 15) {
          // DateTime: YYYYMMDDTHHMMSS
          const datePart = cleanDt.slice(0, 8);
          const timePart = cleanDt.slice(9, 15);
          eventDate = `${datePart.slice(0,4)}-${datePart.slice(4,6)}-${datePart.slice(6,8)}`;
          const hour = parseInt(timePart.slice(0, 2), 10);
          const min = timePart.slice(2, 4);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const h12 = hour % 12 || 12;
          eventTime = `${h12}:${min} ${ampm}`;
        } else {
          continue;
        }

        allEvents.push({ uid, summary, eventDate, eventTime, description, location });
      }
    }

    // Step 5: Save events into all circles the user belongs to
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
            event_time: ev.eventTime,
            description: ev.description,
            location: ev.location,
          });
          totalUpdated++;
        } else {
          await base44.asServiceRole.entities.CalendarEvent.create({
            circle_id: membership.circle_id,
            title: appleTitle,
            description: ev.description,
            event_date: ev.eventDate,
            event_time: ev.eventTime,
            location: ev.location,
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
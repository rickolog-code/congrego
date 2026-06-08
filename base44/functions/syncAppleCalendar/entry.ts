import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Apple Calendar events for the authenticated user via CalDAV.
 * Expects payload: { appleId: string, appPassword: string }
 * The app-specific password is generated at appleid.apple.com → Security → App-Specific Passwords.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appleId, appPassword } = await req.json();
    if (!appleId || !appPassword) {
      return Response.json({ error: 'appleId and appPassword are required' }, { status: 400 });
    }

    const credentials = btoa(`${appleId}:${appPassword}`);
    const authHeader = `Basic ${credentials}`;

    // Step 1: Discover the user's CalDAV principal URL
    const discoverRes = await fetch('https://caldav.icloud.com/', {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Depth: '0',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <current-user-principal/>
  </prop>
</propfind>`,
    });

    if (discoverRes.status === 401) {
      return Response.json({ error: 'Invalid Apple ID or app-specific password. Make sure you are using an app-specific password from appleid.apple.com.' }, { status: 401 });
    }
    if (!discoverRes.ok) {
      return Response.json({ error: `CalDAV discovery failed (${discoverRes.status})` }, { status: 400 });
    }

    const discoverText = await discoverRes.text();
    const principalMatch = discoverText.match(/<href>([^<]+principal[^<]*)<\/href>/i);
    if (!principalMatch) {
      return Response.json({ error: 'Could not find CalDAV principal URL' }, { status: 400 });
    }

    const principalPath = principalMatch[1];
    const principalUrl = principalPath.startsWith('http')
      ? principalPath
      : `https://caldav.icloud.com${principalPath}`;

    // Step 2: Find the calendar home set
    const homeRes = await fetch(principalUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Depth: '0',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <C:calendar-home-set/>
  </prop>
</propfind>`,
    });

    const homeText = await homeRes.text();
    const homeMatch = homeText.match(/<href>([^<]*calendars[^<]*)<\/href>/i);
    if (!homeMatch) {
      return Response.json({ error: 'Could not find calendar home set' }, { status: 400 });
    }

    const homePath = homeMatch[1];
    const homeUrl = homePath.startsWith('http')
      ? homePath
      : `https://caldav.icloud.com${homePath}`;

    // Step 3: List calendars
    const calListRes = await fetch(homeUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/xml',
        Depth: '1',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <prop>
    <resourcetype/>
    <displayname/>
  </prop>
</propfind>`,
    });

    const calListText = await calListRes.text();
    // Extract calendar collection hrefs (skip the home itself)
    const calHrefRegex = /<response>[\s\S]*?<href>([^<]+)<\/href>[\s\S]*?<resourcetype>[\s\S]*?<calendar[\s\S]*?<\/resourcetype>/gi;
    const calendarPaths = [];
    let match;
    while ((match = calHrefRegex.exec(calListText)) !== null) {
      const path = match[1];
      if (path !== homePath && !calendarPaths.includes(path)) {
        calendarPaths.push(path);
      }
    }

    if (calendarPaths.length === 0) {
      return Response.json({ error: 'No calendars found on this Apple account' }, { status: 400 });
    }

    // Step 4: Fetch events from each calendar (next 14 days)
    const now = new Date();
    const timeMin = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const allEvents = [];

    for (const calPath of calendarPaths) {
      const calUrl = calPath.startsWith('http') ? calPath : `https://caldav.icloud.com${calPath}`;
      const eventsRes = await fetch(calUrl, {
        method: 'REPORT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/xml',
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
        <time-range start="${timeMin}" end="${timeMax}"/>
      </comp-filter>
    </comp-filter>
  </filter>
</calendar-query>`,
      });

      if (!eventsRes.ok) continue;
      const eventsText = await eventsRes.text();

      // Parse VCALENDAR data blocks
      const vcalBlocks = eventsText.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];
      for (const block of vcalBlocks) {
        const veventMatch = block.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
        if (!veventMatch) continue;
        const vevent = veventMatch[1];

        const uid = (vevent.match(/^UID:(.+)$/m) || [])[1]?.trim();
        const summary = (vevent.match(/^SUMMARY:(.+)$/m) || [])[1]?.trim() || 'Busy';
        const dtstart = (vevent.match(/^DTSTART[^:]*:(.+)$/m) || [])[1]?.trim();
        const description = (vevent.match(/^DESCRIPTION:(.+)$/m) || [])[1]?.trim() || '';
        const location = (vevent.match(/^LOCATION:(.+)$/m) || [])[1]?.trim() || '';

        if (!dtstart || !uid) continue;

        let eventDate, eventTime = null;
        if (dtstart.length === 8) {
          // All-day: YYYYMMDD
          eventDate = `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`;
        } else {
          // DateTime: YYYYMMDDTHHMMSSZ
          const y = dtstart.slice(0,4), mo = dtstart.slice(4,6), d = dtstart.slice(6,8);
          const h = dtstart.slice(9,11), mi = dtstart.slice(11,13);
          eventDate = `${y}-${mo}-${d}`;
          const hour = parseInt(h, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const h12 = hour % 12 || 12;
          eventTime = `${h12}:${mi} ${ampm}`;
        }

        allEvents.push({ uid, summary, eventDate, eventTime, description, location });
      }
    }

    // Step 5: Save events to all circles the user belongs to
    const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'User is not a member of any circle' }, { status: 400 });
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
          });
          totalNew++;
        }
      }

      // Mark synced
      if (!membership.calendar_synced || membership.calendar_provider !== 'apple') {
        await base44.asServiceRole.entities.CircleMember.update(membership.id, {
          calendar_synced: true,
          calendar_provider: 'apple',
        });
      }
    }

    return Response.json({
      message: 'Apple Calendar sync complete',
      newEvents: totalNew,
      updatedEvents: totalUpdated,
      calendarsScanned: calendarPaths.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
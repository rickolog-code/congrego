import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Google Calendar events for ALL app users who have connected their Google Calendar.
 * - Fetches ALL user calendars (not just primary) so work/personal/shared calendars are included
 * - Stores both start and end times for each event
 * - Paginates through all results (250 per page) so no events are missed
 * - Cleans up stale events that were deleted from Google
 */

const CONNECTOR_ID = '6a134e97b8274a0809c582f7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const callerUser = await base44.auth.me().catch(() => null);

    let usersToSync = [];
    if (callerUser) {
      usersToSync = [callerUser];
    } else {
      const syncedMembers = await base44.asServiceRole.entities.CircleMember.filter({ calendar_synced: true });
      const uniqueEmails = [...new Set(syncedMembers.map(m => m.user_email))];
      usersToSync = uniqueEmails.map(email => ({ email }));
    }

    if (usersToSync.length === 0) {
      return Response.json({ message: 'No users to sync', synced: 0 });
    }

    let totalSynced = 0;
    let totalUpdated = 0;
    const errors = [];

    for (const user of usersToSync) {
      try {
        const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID, user.email).catch(() => null);
        if (!connection?.accessToken) continue;

        const { accessToken } = connection;

        const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
        if (!memberships || memberships.length === 0) continue;

        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

        // Step 1: Get all calendars for this user
        const calListRes = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const calListData = calListRes.ok ? await calListRes.json() : { items: [] };
        const calendars = (calListData.items || []).filter(c => c.selected !== false);

        // If calendarList fails, fall back to primary only
        const calendarIds = calendars.length > 0
          ? calendars.map(c => c.id)
          : ['primary'];

        // Step 2: Fetch events from all calendars, collect unique events by ID
        const allEventsById = new Map();

        for (const calId of calendarIds) {
          let pageToken = null;
          do {
            const params = new URLSearchParams({
              timeMin,
              timeMax,
              singleEvents: 'true',
              orderBy: 'startTime',
              maxResults: '250',
            });
            if (pageToken) params.set('pageToken', pageToken);

            const gcalRes = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!gcalRes.ok) break;

            const gcalData = await gcalRes.json();
            for (const ev of (gcalData.items || [])) {
              if (ev.status !== 'cancelled' && ev.start && !allEventsById.has(ev.id)) {
                allEventsById.set(ev.id, ev);
              }
            }

            pageToken = gcalData.nextPageToken || null;
          } while (pageToken);
        }

        // Step 3: Upsert — for each circle, load existing gcal events keyed by external_uid,
        // then update matches, create new ones, and delete stale ones.
        // This is race-safe: no bulk-delete step that races with inserts.
        const incomingIds = new Set(allEventsById.keys());

        for (const membership of memberships) {
          // list() bypasses RLS (service role), then filter in-memory.
          // filter() with asServiceRole still applies RLS on CalendarEvent due to circle_id constraint.
          const existingAll = await base44.asServiceRole.entities.CalendarEvent.list();
          const existingList = existingAll.filter(
            ev => ev.circle_id === membership.circle_id && ev.creator_email === user.email && ev.event_type === 'event' && ev.title?.startsWith('[gcal:')
          );
          const existingByUid = new Map();
          for (const ev of existingList) {
            if (!ev.title?.startsWith('[gcal:')) continue;
            if (ev.external_uid) {
              if (existingByUid.has(ev.external_uid)) {
                // Duplicate record — delete the extra immediately
                await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
              } else {
                existingByUid.set(ev.external_uid, ev);
              }
            } else {
              // Legacy record with no external_uid — delete it so it can be re-created cleanly
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
            }
          }

          // Upsert incoming events
          for (const event of allEventsById.values()) {
            const startDate = event.start.date || extractDate(event.start.dateTime);
            if (!startDate) continue;

            const startTime = extractTime(event.start.dateTime);
            const endTime = extractTime(event.end?.dateTime);
            const timeDisplay = startTime && endTime ? `${startTime} – ${endTime}` : (startTime || null);
            const gcalTitle = `[gcal:${event.id}] ${event.summary || 'Busy'}`;
            const creatorName = membership.username || user.full_name || user.email?.split('@')[0];

            if (existingByUid.has(event.id)) {
              await base44.asServiceRole.entities.CalendarEvent.update(existingByUid.get(event.id).id, {
                title: gcalTitle,
                event_date: startDate,
                event_time: timeDisplay,
                location: event.location || '',
                description: event.description || '',
              });
              totalUpdated++;
            } else {
              await base44.asServiceRole.entities.CalendarEvent.create({
                circle_id: membership.circle_id,
                title: gcalTitle,
                external_uid: event.id,
                description: event.description || '',
                event_date: startDate,
                event_time: timeDisplay,
                location: event.location || '',
                creator_email: user.email,
                creator_name: creatorName,
                event_type: 'event',
              });
              totalSynced++;
            }
          }

          // Prune stale events (deleted from Google)
          for (const [uid, ev] of existingByUid) {
            if (!incomingIds.has(uid)) {
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
            }
          }
        }

        // Step 5: Mark memberships as synced
        for (const membership of memberships) {
          if (!membership.calendar_synced) {
            await base44.asServiceRole.entities.CircleMember.update(membership.id, { calendar_synced: true });
          }
        }
      } catch (userError) {
        errors.push({ email: user.email, error: userError.message });
      }
    }

    return Response.json({
      message: 'Sync complete',
      newEvents: totalSynced,
      updatedEvents: totalUpdated,
      usersProcessed: usersToSync.length,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Extract YYYY-MM-DD from a dateTime string like "2026-06-12T10:00:00-04:00".
 */
function extractDate(dateTime) {
  if (!dateTime) return null;
  return dateTime.split('T')[0];
}

/**
 * Extract local time from a dateTime string like "2026-06-12T10:00:00-04:00".
 * Reads the wall-clock digits directly before the offset — never uses new Date()
 * which would shift to Deno's server UTC timezone.
 */
function extractTime(dateTime) {
  if (!dateTime) return null;
  const m = dateTime.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Google Calendar events for the authenticated user (or all synced users if called by scheduler).
 * Uses user-scoped reads (RLS-compliant) and service-role writes.
 * Idempotent: upserts by external_uid so repeated calls never create duplicates.
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
      const syncedMembers = await base44.asServiceRole.entities.CircleMember.filter({ calendar_synced: true, calendar_provider: 'google' });
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

        // Step 1: Get all calendars
        const calListRes = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const calListData = calListRes.ok ? await calListRes.json() : { items: [] };
        const calendars = (calListData.items || []).filter(c => c.selected !== false);
        const calendarIds = calendars.length > 0 ? calendars.map(c => c.id) : ['primary'];

        // Step 2: Fetch all events from Google (unique by event ID)
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

        const incomingIds = new Set(allEventsById.keys());

        // Step 3: For each circle, read existing gcal events using USER-scoped client
        // (user-scoped reads pass RLS since user.data.circle_ids is populated).
        // Use asServiceRole only for writes/deletes.
        for (const membership of memberships) {
          // Read existing with user-scoped client — satisfies circle_id RLS
          let existingRaw = [];
          if (callerUser) {
            existingRaw = await base44.entities.CalendarEvent.filter({ circle_id: membership.circle_id });
          } else {
            // Scheduled/background call: no user session — fetch via service role using creator_email filter
            existingRaw = await base44.asServiceRole.entities.CalendarEvent.filter({ creator_email: user.email });
          }

          const existingList = existingRaw.filter(
            ev => ev.circle_id === membership.circle_id &&
                  ev.creator_email === user.email &&
                  ev.event_type === 'event' &&
                  ev.title?.startsWith('[gcal:')
          );

          // Build map of external_uid → record, deduplicating on the way
          const existingByUid = new Map();
          for (const ev of existingList) {
            if (!ev.external_uid) {
              // No uid — legacy record, delete it
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
              continue;
            }
            if (existingByUid.has(ev.external_uid)) {
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
            } else {
              existingByUid.set(ev.external_uid, ev);
            }
          }

          const creatorName = membership.username || user.full_name || user.email?.split('@')[0];

          // Step 4: Upsert
          for (const event of allEventsById.values()) {
            const startDate = event.start.date || extractDate(event.start.dateTime);
            if (!startDate) continue;

            const startTime = extractTime(event.start.dateTime);
            const endTime = extractTime(event.end?.dateTime);
            const timeDisplay = startTime && endTime ? `${startTime} – ${endTime}` : (startTime || null);
            const gcalTitle = `[gcal:${event.id}] ${event.summary || 'Busy'}`;

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

          // Step 5: Prune stale events removed from Google
          for (const [uid, ev] of existingByUid) {
            if (!incomingIds.has(uid)) {
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
            }
          }
        }

        // Step 6: Mark memberships as calendar_synced
        for (const membership of memberships) {
          if (!membership.calendar_synced) {
            await base44.asServiceRole.entities.CircleMember.update(membership.id, {
              calendar_synced: true,
              calendar_provider: 'google',
            });
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

function extractDate(dateTime) {
  if (!dateTime) return null;
  return dateTime.split('T')[0];
}

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
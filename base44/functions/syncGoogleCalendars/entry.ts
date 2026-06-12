import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Google Calendar events for ALL app users who have connected their Google Calendar.
 * Designed to be called both by the scheduled automation (no user JWT) and by the frontend (with user JWT).
 * All entity operations use asServiceRole to bypass RLS.
 *
 * Key design decisions:
 * - singleEvents=true expands recurring events into individual instances
 * - We paginate through ALL pages of results (no maxResults cap) so nothing is missed
 * - We use a 60-day window to match what CalendarPage displays
 * - Times are extracted directly from the ISO offset string (e.g. T10:00:00-04:00 → 10:00 AM)
 *   to avoid Deno's server UTC timezone shifting the displayed time
 * - After fetching, we delete any previously-synced gcal events whose IDs are no longer in the
 *   current window (handles deleted/rescheduled events and clears stale duplicates)
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
        // 60-day window to match what the calendar UI shows
        const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch ALL pages of events from the primary Google Calendar
        const allGcalEvents = [];
        let pageToken = null;

        do {
          const params = new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250', // max allowed per page
          });
          if (pageToken) params.set('pageToken', pageToken);

          const gcalRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!gcalRes.ok) break;

          const gcalData = await gcalRes.json();
          const items = gcalData.items || [];
          for (const ev of items) allGcalEvents.push(ev);

          pageToken = gcalData.nextPageToken || null;
        } while (pageToken);

        // Build a set of IDs coming in from Google for stale-cleanup below
        const incomingIds = new Set();

        for (const event of allGcalEvents) {
          if (event.status === 'cancelled' || !event.start) continue;

          const startDate = event.start.date || extractDate(event.start.dateTime);
          if (!startDate) continue;

          const startTime = extractTime(event.start.dateTime);
          const gcalTitle = `[gcal:${event.id}] ${event.summary || 'Busy'}`;
          incomingIds.add(event.id);

          for (const membership of memberships) {
            const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
              circle_id: membership.circle_id,
              creator_email: user.email,
              external_uid: event.id,
            });

            if (existing && existing.length > 0) {
              // Clean up any duplicates, keep the first
              for (let i = 1; i < existing.length; i++) {
                await base44.asServiceRole.entities.CalendarEvent.delete(existing[i].id);
              }
              await base44.asServiceRole.entities.CalendarEvent.update(existing[0].id, {
                title: gcalTitle,
                event_date: startDate,
                event_time: startTime,
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
                event_time: startTime,
                location: event.location || '',
                creator_email: user.email,
                creator_name: membership.username || user.full_name || user.email?.split('@')[0],
                event_type: 'event',
              });
              totalSynced++;
            }
          }
        }

        // Remove any previously-synced gcal events that are no longer in the window
        // (deleted events, past events rolling out of the 60-day window, etc.)
        for (const membership of memberships) {
          const existingGcal = await base44.asServiceRole.entities.CalendarEvent.filter({
            circle_id: membership.circle_id,
            creator_email: user.email,
            event_type: 'event',
          });
          for (const ev of existingGcal) {
            if (ev.title?.startsWith('[gcal:') && ev.external_uid && !incomingIds.has(ev.external_uid)) {
              await base44.asServiceRole.entities.CalendarEvent.delete(ev.id);
            }
          }
        }

        // Mark memberships as synced
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
 * We split on T and take the date part, which is always the local calendar date.
 */
function extractDate(dateTime) {
  if (!dateTime) return null;
  return dateTime.split('T')[0];
}

/**
 * Extract local time from a dateTime string like "2026-06-12T10:00:00-04:00".
 * The digits before the timezone offset ARE the local event time — we read them directly
 * instead of using new Date() which would convert to Deno's server UTC timezone.
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
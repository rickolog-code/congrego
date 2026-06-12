import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Syncs Google Calendar events for ALL app users who have connected their Google Calendar.
 * Designed to be called both by the scheduled automation (no user JWT) and by the frontend (with user JWT).
 * All entity operations use asServiceRole to bypass RLS.
 */

const CONNECTOR_ID = '6a134e97b8274a0809c582f7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // If called from frontend by a logged-in user, only sync that user.
    // If called from scheduled automation (no JWT), sync all connected users.
    let usersToSync = [];

    const callerUser = await base44.auth.me().catch(() => null);

    if (callerUser) {
      // Frontend call — sync just this user
      usersToSync = [callerUser];
    } else {
      // Scheduled call — find all CircleMembers with calendar_synced=true
      // and get their unique emails to sync
      const syncedMembers = await base44.asServiceRole.entities.CircleMember.filter({ calendar_synced: true });
      const uniqueEmails = [...new Set(syncedMembers.map(m => m.user_email))];

      // Build minimal user objects from emails
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
        // Get this user's Google Calendar access token
        const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID, user.email).catch(() => null);

        if (!connection?.accessToken) continue;

        const { accessToken } = connection;

        // Find this user's circle memberships
        const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
        if (!memberships || memberships.length === 0) continue;

        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch events from primary Google Calendar
        const gcalRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '50',
          }),
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!gcalRes.ok) continue;

        const gcalData = await gcalRes.json();
        const events = gcalData.items || [];

        for (const membership of memberships) {
          for (const event of events) {
            if (event.status === 'cancelled' || !event.start) continue;

            const startDate = event.start.date || event.start.dateTime?.split('T')[0];
            if (!startDate) continue;

            // Parse time directly from the ISO string to avoid Deno server timezone shifting
            let startTime = null;
            if (event.start.dateTime) {
              // event.start.dateTime looks like "2024-06-12T08:00:00-04:00"
              // Extract the local time digits directly — don't use new Date() which converts to server TZ
              const timeMatch = event.start.dateTime.match(/T(\d{2}):(\d{2})/);
              if (timeMatch) {
                const hh = parseInt(timeMatch[1], 10);
                const mm = timeMatch[2];
                const ampm = hh >= 12 ? 'PM' : 'AM';
                const h12 = hh % 12 || 12;
                startTime = `${h12}:${mm} ${ampm}`;
              }
            }

            const gcalTitle = `[gcal:${event.id}] ${event.summary || 'Busy'}`;

            const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
              circle_id: membership.circle_id,
              creator_email: user.email,
              external_uid: event.id,
            });

            if (existing && existing.length > 0) {
              // Delete duplicates if somehow more than one crept in
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
                creator_name: membership.username || user.full_name || user.email.split('@')[0],
              });
              totalSynced++;
            }
          }
        }

        // Mark memberships as calendar_synced
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
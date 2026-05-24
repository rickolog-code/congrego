import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Called by the frontend (with the user's JWT in the request).
 * Fetches the current user's Google Calendar events and upserts them
 * into the CalendarEvent entity for their circle.
 */

const CONNECTOR_ID = '6a134e97b8274a0809c582f7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get this user's Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    // Find this user's circle memberships
    const memberships = await base44.entities.CircleMember.filter({ user_email: user.email });

    if (!memberships || memberships.length === 0) {
      return Response.json({ message: 'No circle memberships found', synced: 0 });
    }

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

    if (!gcalRes.ok) {
      const errText = await gcalRes.text();
      return Response.json({ error: `Google Calendar API error: ${gcalRes.status}`, details: errText }, { status: 502 });
    }

    const gcalData = await gcalRes.json();
    const events = gcalData.items || [];

    let totalSynced = 0;
    let totalUpdated = 0;

    for (const membership of memberships) {
      for (const event of events) {
        if (event.status === 'cancelled' || !event.start) continue;

        const startDate = event.start.date || event.start.dateTime?.split('T')[0];
        if (!startDate) continue;

        const startTime = event.start.dateTime
          ? new Date(event.start.dateTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : null;

        // Use a title marker to identify gcal-sourced events
        const gcalTitle = `[gcal:${event.id}] ${event.summary || 'Busy'}`;

        const existing = await base44.asServiceRole.entities.CalendarEvent.filter({
          circle_id: membership.circle_id,
          creator_email: user.email,
          title: gcalTitle,
        });

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.CalendarEvent.update(existing[0].id, {
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

    // Mark membership(s) as calendar_synced
    for (const membership of memberships) {
      if (!membership.calendar_synced) {
        await base44.asServiceRole.entities.CircleMember.update(membership.id, { calendar_synced: true });
      }
    }

    return Response.json({
      message: 'Sync complete',
      newEvents: totalSynced,
      updatedEvents: totalUpdated,
      circles: memberships.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
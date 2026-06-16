import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a134e97b8274a0809c582f7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID, user.email).catch(() => null);
    if (!connection?.accessToken) {
      return Response.json({ error: 'Google Calendar not connected.' }, { status: 400 });
    }

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250',
      { headers: { Authorization: `Bearer ${connection.accessToken}` } }
    );
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch calendar list from Google.' }, { status: 502 });
    }

    const data = await res.json();
    const calendars = (data.items || []).map(c => ({
      id: c.id,
      summary: c.summary || c.id,
      backgroundColor: c.backgroundColor || '#4285F4',
    }));

    return Response.json({ calendars });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
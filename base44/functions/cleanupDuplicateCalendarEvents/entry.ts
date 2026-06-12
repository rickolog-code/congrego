import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * One-time cleanup: removes duplicate gcal/apple synced CalendarEvent records.
 * Keeps only the first record per (circle_id, creator_email, external_uid) group.
 * Also removes legacy records with no external_uid (can't be deduped).
 * Admin-only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Read all synced calendar events using user-scoped client (passes RLS)
    // Paginate to get everything
    const allSynced = [];
    let skip = 0;
    const PAGE = 100;
    while (true) {
      const page = await base44.entities.CalendarEvent.list('created_date', PAGE, skip);
      if (!page || page.length === 0) break;
      for (const ev of page) {
        if (ev.event_type === 'event' && (ev.title?.startsWith('[gcal:') || ev.title?.startsWith('[apple:'))) {
          allSynced.push(ev);
        }
      }
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    console.log(`[CLEANUP] Found ${allSynced.length} synced events to analyze`);

    // Group by (circle_id, creator_email, external_uid)
    const seen = new Map(); // key → first record id
    const toDelete = [];

    for (const ev of allSynced) {
      if (!ev.external_uid) {
        // No external_uid — legacy, delete
        toDelete.push(ev.id);
        continue;
      }
      const key = `${ev.circle_id}::${ev.creator_email}::${ev.external_uid}`;
      if (seen.has(key)) {
        toDelete.push(ev.id);
      } else {
        seen.set(key, ev.id);
      }
    }

    console.log(`[CLEANUP] Deleting ${toDelete.length} duplicate/legacy records`);

    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.CalendarEvent.delete(id);
      deleted++;
    }

    return Response.json({
      message: 'Cleanup complete',
      analyzed: allSynced.length,
      deleted,
      kept: allSynced.length - deleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
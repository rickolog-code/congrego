import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { circleId } = await req.json();
    if (!circleId) return Response.json({ error: 'circleId required' }, { status: 400 });

    // Verify user is host of this circle
    const membership = await base44.asServiceRole.entities.CircleMember.filter({
      circle_id: circleId,
      user_email: user.email,
      role: 'host',
    });
    if (!membership?.length) {
      return Response.json({ error: 'Only circle hosts can delete' }, { status: 403 });
    }

    // 1. Get all posts for this circle
    const posts = await base44.asServiceRole.entities.Post.filter({ circle_id: circleId });

    // 2. Delete all comments for these posts
    if (posts.length > 0) {
      const postIds = posts.map(p => p.id);
      // Paginate comment deletion
      let comments = await base44.asServiceRole.entities.Comment.filter({}, '-created_date', 500);
      const relatedComments = comments.filter(c => postIds.includes(c.post_id));
      while (relatedComments.length > 0 || comments.length === 500) {
        for (const c of relatedComments) {
          await base44.asServiceRole.entities.Comment.delete(c.id);
        }
        if (comments.length < 500) break;
        const lastDate = comments[comments.length - 1].created_date;
        comments = await base44.asServiceRole.entities.Comment.filter({
          created_date: { $lt: lastDate },
        }, '-created_date', 500);
        const batch = comments.filter(c => postIds.includes(c.post_id));
        if (batch.length === 0 && comments.length < 500) break;
        for (const c of batch) {
          await base44.asServiceRole.entities.Comment.delete(c.id);
        }
      }

      // 3. Delete all posts
      for (const p of posts) {
        await base44.asServiceRole.entities.Post.delete(p.id);
      }
    }

    // 4. Delete all calendar events
    let events = await base44.asServiceRole.entities.CalendarEvent.filter({ circle_id: circleId }, '-created_date', 500);
    while (events.length > 0) {
      for (const e of events) {
        await base44.asServiceRole.entities.CalendarEvent.delete(e.id);
      }
      if (events.length < 500) break;
      const lastDate = events[events.length - 1].created_date;
      events = await base44.asServiceRole.entities.CalendarEvent.filter({
        circle_id: circleId,
        created_date: { $lt: lastDate },
      }, '-created_date', 500);
    }

    // 5. Delete all multiplayer games
    let games = await base44.asServiceRole.entities.MultiplayerGame.filter({ circle_id: circleId }, '-created_date', 500);
    while (games.length > 0) {
      for (const g of games) {
        await base44.asServiceRole.entities.MultiplayerGame.delete(g.id);
      }
      if (games.length < 500) break;
      const lastDate = games[games.length - 1].created_date;
      games = await base44.asServiceRole.entities.MultiplayerGame.filter({
        circle_id: circleId,
        created_date: { $lt: lastDate },
      }, '-created_date', 500);
    }

    // 6. Get all members to clean up their circle_ids
    let members = await base44.asServiceRole.entities.CircleMember.filter({ circle_id: circleId }, '-created_date', 500);
    while (members.length > 0) {
      for (const m of members) {
        await base44.asServiceRole.entities.CircleMember.delete(m.id);
      }
      if (members.length < 500) break;
      const lastDate = members[members.length - 1].created_date;
      members = await base44.asServiceRole.entities.CircleMember.filter({
        circle_id: circleId,
        created_date: { $lt: lastDate },
      }, '-created_date', 500);
    }

    // 7. Delete the circle itself
    await base44.asServiceRole.entities.Circle.delete(circleId);

    // 8. Clean up user's circle_ids and hosted_circle_ids
    const currentUser = await base44.auth.me();
    const updatedCircleIds = (currentUser.circle_ids || []).filter(id => id !== circleId);
    const updatedHostedIds = (currentUser.hosted_circle_ids || []).filter(id => id !== circleId);
    await base44.auth.updateMe({
      circle_ids: updatedCircleIds,
      hosted_circle_ids: updatedHostedIds,
    });

    return Response.json({ success: true, deletedCircleId: circleId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
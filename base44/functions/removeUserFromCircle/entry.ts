import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Removes a circle from a kicked user's circle_ids so RLS stops leaking
 * that circle's posts and calendar events to the kicked user.
 * Called after a successful vote-kick from PostCard.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userEmail, circleId } = await req.json();
    if (!userEmail || !circleId) {
      return Response.json({ error: 'userEmail and circleId are required' }, { status: 400 });
    }

    // List all users and find the target by email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers?.find(u => u.email === userEmail);
    if (!targetUser) {
      return Response.json({ ok: true }); // nothing to do
    }

    const updatedCircleIds = (targetUser.circle_ids || []).filter(id => id !== circleId);
    const updatedHostedIds = (targetUser.hosted_circle_ids || []).filter(id => id !== circleId);

    await base44.asServiceRole.entities.User.update(targetUser.id, {
      circle_ids: updatedCircleIds,
      hosted_circle_ids: updatedHostedIds,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
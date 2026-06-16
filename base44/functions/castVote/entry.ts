import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId, vote } = await req.json();
    if (!postId || !['yes', 'no'].includes(vote)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch the post with service role
    const post = await base44.asServiceRole.entities.Post.get(postId);
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

    // Verify the user is a member of the post's circle
    const memberships = await base44.asServiceRole.entities.CircleMember.filter({
      circle_id: post.circle_id,
      user_email: user.email,
    });
    if (!memberships?.length) {
      return Response.json({ error: 'Not a member of this circle' }, { status: 403 });
    }

    const yesVotes = [...(post.yes_votes || [])];
    const noVotes = [...(post.no_votes || [])];

    if (vote === 'yes') {
      if (!yesVotes.includes(user.email)) yesVotes.push(user.email);
      const ni = noVotes.indexOf(user.email);
      if (ni !== -1) noVotes.splice(ni, 1);
    } else {
      if (!noVotes.includes(user.email)) noVotes.push(user.email);
      const yi = yesVotes.indexOf(user.email);
      if (yi !== -1) yesVotes.splice(yi, 1);
    }

    await base44.asServiceRole.entities.Post.update(postId, { yes_votes: yesVotes, no_votes: noVotes });

    // Check if vote kick threshold is reached
    let kicked = false;
    let voteDone = false;
    if (post.post_type === 'vote' && post.vote_target_email && post.circle_id) {
      const members = await base44.asServiceRole.entities.CircleMember.filter({ circle_id: post.circle_id });
      const hostMember = members.find(m => m.role === 'host');
      const hostEmail = hostMember?.user_email;

      const totalWeight = members.reduce((sum, m) => sum + (m.user_email === hostEmail ? 2 : 1), 0);
      const yesWeight = yesVotes.reduce((sum, email) => sum + (email === hostEmail ? 2 : 1), 0);
      const noWeight = noVotes.reduce((sum, email) => sum + (email === hostEmail ? 2 : 1), 0);

      if (yesWeight > totalWeight / 2) {
        // Kick the target
        const targetMember = members.find(m => m.user_email === post.vote_target_email);
        if (targetMember) {
          await base44.asServiceRole.entities.CircleMember.delete(targetMember.id);
          const circle = await base44.asServiceRole.entities.Circle.get(post.circle_id);
          if (circle?.id) {
            await base44.asServiceRole.entities.Circle.update(post.circle_id, {
              member_count: Math.max(0, (circle.member_count || 1) - 1),
            });
          }
          await base44.functions.invoke('removeUserFromCircle', {
            userEmail: post.vote_target_email,
            circleId: post.circle_id,
          }).catch(() => {});
        }
        await base44.asServiceRole.entities.Post.delete(postId);
        kicked = true;
        voteDone = true;
      } else if (noWeight > totalWeight / 2) {
        await base44.asServiceRole.entities.Post.delete(postId);
        voteDone = true;
      }
    }

    return Response.json({ success: true, yesVotes, noVotes, kicked, voteDone });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
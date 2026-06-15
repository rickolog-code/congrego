import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { MessageCircle, MoreVertical, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import CommentSection from './CommentSection';

function VoterAvatars({ emails, members }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1 justify-center">
      {emails.slice(0, 8).map((email) => {
        const m = members.find(m => m.user_email === email);
        return m?.profile_image ? (
          <img key={email} src={m.profile_image} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm" />
        ) : (
          <div key={email} className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-500">{(m?.username || email)?.[0]?.toUpperCase()}</span>
          </div>
        );
      })}
      {emails.length > 8 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-muted flex items-center justify-center shadow-sm">
          <span className="text-[8px] font-bold text-muted-foreground">+{emails.length - 8}</span>
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post }) {
  const { user, activeCircleId } = useCircle();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);

  const upvotes = post.upvotes || [];
  const downvotes = post.downvotes || [];

  // Fetch members for vote post avatar display
  const isVotePost = post.post_type === 'vote';
  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId && isVotePost,
  });

  const handleSpecialVote = async (vote) => {
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

    await base44.entities.Post.update(post.id, { yes_votes: yesVotes, no_votes: noVotes });
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });

    // Check if vote kick threshold is reached (only for vote posts with a target)
    if (post.post_type === 'vote' && post.vote_target_email && activeCircleId) {
      const members = await base44.entities.CircleMember.filter({ circle_id: activeCircleId });
      const hostMember = members.find(m => m.role === 'host');
      const hostEmail = hostMember?.user_email;

      // Calculate effective yes vote weight (host = 2, others = 1)
      const yesWeight = yesVotes.reduce((sum, email) => sum + (email === hostEmail ? 2 : 1), 0);

      // Total possible votes weight
      const totalWeight = members.reduce((sum, m) => sum + (m.user_email === hostEmail ? 2 : 1), 0);

      // Majority = more than half of total weight
      const noWeight = noVotes.reduce((sum, email) => sum + (email === hostEmail ? 2 : 1), 0);
      const votedWeight = yesWeight + noWeight;

      if (yesWeight > totalWeight / 2) {
        // Kick the target member
        const targetMember = members.find(m => m.user_email === post.vote_target_email);
        if (targetMember) {
          await base44.entities.CircleMember.delete(targetMember.id);

          // Update circle member count
          const circle = (await base44.entities.Circle.filter({ id: activeCircleId }))[0];
          if (circle) {
            await base44.entities.Circle.update(activeCircleId, {
              member_count: Math.max(0, (circle.member_count || 1) - 1),
            });
          }

          // Remove this circle from the kicked user's circle_ids so RLS stops leaking data to them.
          // We do this via a backend function call so we can act with service-role on another user's data.
          await base44.functions.invoke('removeUserFromCircle', {
            userEmail: post.vote_target_email,
            circleId: activeCircleId,
          }).catch(() => {});
        }
        // Delete the vote post
        await base44.entities.Post.delete(post.id);
        queryClient.invalidateQueries({ queryKey: ['circle-members'] });
        queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      } else if (noWeight > totalWeight / 2) {
        // No-votes won — delete the post
        await base44.entities.Post.delete(post.id);
        queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
      }
    }
  };

  const handleDelete = async () => {
    await base44.entities.Post.delete(post.id);
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
  };

  const isCalendarPost = post.post_type === 'calendar_event';
  const isSuggestion = post.post_type === 'suggestion';

  // Extract target name from vote_target_email or post content
  const kickTargetName = post.vote_target_email
    ? (members.find(m => m.user_email === post.vote_target_email)?.username || post.vote_target_email?.split('@')[0])
    : null;

  const yesVoters = post.yes_votes || [];
  const noVoters = post.no_votes || [];
  const hasVotedYes = yesVoters.includes(user?.email);
  const hasVotedNo = noVoters.includes(user?.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl shadow-sm overflow-hidden ${
        isVotePost ? 'border-[3px] border-[#ff2400]' :
        isCalendarPost ? 'border-2 border-[#CFB07E]' :
        isSuggestion ? 'border-2 border-[#00c56c]/60 bg-[#00c56c]/5' :
        'border border-border'
      }`}
    >
      {/* Type Badge */}
      {(isVotePost || isCalendarPost || isSuggestion) && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${
          isVotePost ? 'bg-[#cc1a00] text-white' :
          isCalendarPost ? 'bg-primary/10 text-primary' :
          'bg-[#00c56c]/10 text-[#00c56c]'
        }`}>
          {isCalendarPost && <Calendar className="w-3 h-3" />}
          {isSuggestion && <span>🦎</span>}
          {isVotePost ? (
            <span className="font-extrabold text-sm tracking-wide">
            Kick {kickTargetName} from the circle
            </span>
          ) : isCalendarPost ? 'Calendar Event' : 'Grego suggested'}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* For vote posts: only show buttons, no author row or content */}
        {isVotePost ? (
          <div className="flex gap-3">
            {/* YES button */}
            <button
              onClick={() => handleSpecialVote('yes')}
              className={`flex-1 rounded-2xl py-4 px-3 font-bold border-2 transition-all flex flex-col items-center gap-2 min-h-[100px] ${
                hasVotedYes
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
              }`}
            >
              <span className="text-base">✅ Yes</span>
              <span className={`text-xs font-normal ${hasVotedYes ? 'text-green-100' : 'text-green-600'}`}>{yesVoters.length} vote{yesVoters.length !== 1 ? 's' : ''}</span>
              {yesVoters.length > 0 && <VoterAvatars emails={yesVoters} members={members} />}
            </button>
            {/* NO button */}
            <button
              onClick={() => handleSpecialVote('no')}
              className={`flex-1 rounded-2xl py-4 px-3 font-bold border-2 transition-all flex flex-col items-center gap-2 min-h-[100px] ${
                hasVotedNo
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className="text-base">❌ No</span>
              <span className={`text-xs font-normal ${hasVotedNo ? 'text-red-100' : 'text-red-600'}`}>{noVoters.length} vote{noVoters.length !== 1 ? 's' : ''}</span>
              {noVoters.length > 0 && <VoterAvatars emails={noVoters} members={members} />}
            </button>
          </div>
        ) : (
          <>
            {/* Author row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {post.author_image ? (
                  <img src={post.author_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {post.author_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{post.author_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {post.created_date ? format(new Date(post.created_date), 'MMM d, h:mm a') : ''}
                  </p>
                </div>
              </div>

              {post.author_email === user?.email && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-muted">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content */}
            <p className="text-sm leading-relaxed">{post.content}</p>

            {post.image_url && (
              <img src={post.image_url} alt="" className="rounded-xl w-full max-h-64 object-cover" />
            )}
          </>
        )}

        {/* Actions — thumbs hidden for vote posts, comment always shown */}
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          {!isVotePost && (
            <>
              <button
                onClick={() => {
                  const newUp = [...upvotes];
                  const newDown = [...downvotes];
                  if (upvotes.includes(user?.email)) {
                    newUp.splice(newUp.indexOf(user.email), 1);
                  } else {
                    newUp.push(user.email);
                    const di = newDown.indexOf(user.email);
                    if (di !== -1) newDown.splice(di, 1);
                  }
                  base44.entities.Post.update(post.id, { upvotes: newUp, downvotes: newDown })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['circle-posts'] }));
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  upvotes.includes(user?.email) ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                👍 {upvotes.length > 0 && upvotes.length}
              </button>
              <button
                onClick={() => {
                  const newUp = [...upvotes];
                  const newDown = [...downvotes];
                  if (downvotes.includes(user?.email)) {
                    newDown.splice(newDown.indexOf(user.email), 1);
                  } else {
                    newDown.push(user.email);
                    const ui = newUp.indexOf(user.email);
                    if (ui !== -1) newUp.splice(ui, 1);
                  }
                  base44.entities.Post.update(post.id, { upvotes: newUp, downvotes: newDown })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['circle-posts'] }));
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  downvotes.includes(user?.email) ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                👎 {downvotes.length > 0 && downvotes.length}
              </button>
            </>
          )}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-muted text-muted-foreground"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Comments
          </button>
        </div>

        {showComments && <CommentSection postId={post.id} />}
      </div>
    </motion.div>
  );
}
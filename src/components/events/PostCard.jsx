import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, MoreVertical, Calendar, Vote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import CommentSection from './CommentSection';

export default function PostCard({ post }) {
  const { user } = useCircle();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showVoters, setShowVoters] = useState(null);

  const upvotes = post.upvotes || [];
  const downvotes = post.downvotes || [];
  const hasUpvoted = upvotes.includes(user?.email);
  const hasDownvoted = downvotes.includes(user?.email);

  const handleVote = async (type) => {
    const newUp = [...upvotes];
    const newDown = [...downvotes];

    if (type === 'up') {
      if (hasUpvoted) {
        newUp.splice(newUp.indexOf(user.email), 1);
      } else {
        newUp.push(user.email);
        const di = newDown.indexOf(user.email);
        if (di !== -1) newDown.splice(di, 1);
      }
    } else {
      if (hasDownvoted) {
        newDown.splice(newDown.indexOf(user.email), 1);
      } else {
        newDown.push(user.email);
        const ui = newUp.indexOf(user.email);
        if (ui !== -1) newUp.splice(ui, 1);
      }
    }

    await base44.entities.Post.update(post.id, { upvotes: newUp, downvotes: newDown });
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
  };

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
  };

  const handleDelete = async () => {
    await base44.entities.Post.delete(post.id);
    queryClient.invalidateQueries({ queryKey: ['circle-posts'] });
  };

  const isVotePost = post.post_type === 'vote';
  const isCalendarPost = post.post_type === 'calendar_event';
  const isSuggestion = post.post_type === 'suggestion';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${
        isVotePost ? 'border-amber-300 bg-amber-50/30' :
        isCalendarPost ? 'border-[#CFB07E] border-2' :
        isSuggestion ? 'border-[#00c56c]/60 bg-[#00c56c]/5 border-2' :
        'border-border'
      }`}
    >
      {/* Type Badge */}
      {(isVotePost || isCalendarPost || isSuggestion) && (
        <div className={`px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 ${
          isVotePost ? 'bg-amber-100 text-amber-800' :
          isCalendarPost ? 'bg-primary/10 text-primary' :
          'bg-[#00c56c]/10 text-[#00c56c]'
        }`}>
          {isVotePost ? <Vote className="w-3 h-3" /> : isCalendarPost ? <Calendar className="w-3 h-3" /> : <span>🦎</span>}
          {isVotePost ? 'Group Vote' : isCalendarPost ? 'Calendar Event' : 'Grego suggested'}
        </div>
      )}

      <div className="p-4 space-y-3">
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

        {/* Special Vote Buttons */}
        {isVotePost && (
          <div className="flex gap-2">
            <Button
              variant={post.yes_votes?.includes(user?.email) ? 'default' : 'outline'}
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => handleSpecialVote('yes')}
            >
              Yes ({post.yes_votes?.length || 0})
            </Button>
            <Button
              variant={post.no_votes?.includes(user?.email) ? 'destructive' : 'outline'}
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => handleSpecialVote('no')}
            >
              No ({post.no_votes?.length || 0})
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          <button
            onClick={() => handleVote('up')}
            onContextMenu={(e) => { e.preventDefault(); setShowVoters('up'); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              hasUpvoted ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {upvotes.length > 0 && upvotes.length}
          </button>
          <button
            onClick={() => handleVote('down')}
            onContextMenu={(e) => { e.preventDefault(); setShowVoters('down'); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              hasDownvoted ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            {downvotes.length > 0 && downvotes.length}
          </button>
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

      {/* Voters Dialog */}
      <Dialog open={!!showVoters} onOpenChange={() => setShowVoters(null)}>
        <DialogContent className="rounded-3xl max-w-xs">
          <DialogHeader>
            <DialogTitle>{showVoters === 'up' ? 'Upvotes' : 'Downvotes'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(showVoters === 'up' ? upvotes : downvotes).map((email) => (
              <p key={email} className="text-sm">{email}</p>
            ))}
            {(showVoters === 'up' ? upvotes : downvotes).length === 0 && (
              <p className="text-sm text-muted-foreground">No votes yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
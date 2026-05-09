import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommentSection({ postId }) {
  const { user, myMembership } = useCircle();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, '-created_date'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await base44.entities.Comment.create({
      post_id: postId,
      author_email: user.email,
      author_name: myMembership?.username || user.full_name || user.email.split('@')[0],
      author_image: myMembership?.profile_image || '',
      content: text.trim(),
    });
    setText('');
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <AnimatePresence>
        {comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            {comment.author_image ? (
              <img src={comment.author_image} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-primary">
                  {comment.author_name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="bg-muted rounded-xl px-3 py-2 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{comment.author_name}</span>
                <span className="text-[9px] text-muted-foreground">
                  {comment.created_date ? format(new Date(comment.created_date), 'h:mm a') : ''}
                </span>
              </div>
              <p className="text-xs mt-0.5">{comment.content}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-xl text-sm h-9"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
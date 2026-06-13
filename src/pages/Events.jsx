import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PostCard from '@/components/events/PostCard';
import CreatePostModal from '@/components/events/CreatePostModal';
import { useFreeDaySuggestion } from '@/hooks/useFreeDaySuggestion';

export default function Events() {
  const { activeCircleId, activeCircle, user, myMembership, circles } = useCircle();
  const queryClient = useQueryClient();

  useFreeDaySuggestion({
    circleId: activeCircleId,
    userEmail: user?.email,
    userName: myMembership?.username || user?.full_name,
  });
  const [showCreate, setShowCreate] = useState(false);

  // The set of circle IDs the user currently belongs to
  const myCircleIds = circles.map(c => c.id);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['circle-posts', activeCircleId],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.filter({ circle_id: activeCircleId }, '-created_date');

      // Clean up stale completed vote posts
      const stalePosts = allPosts.filter(p => p.post_type === 'vote' && p.content?.includes('✅ Vote passed'));

      // Auto-delete suggestion posts whose suggested date has passed
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiredSuggestions = allPosts.filter(p => {
        if (p.post_type !== 'suggestion') return false;
        const match = p.content?.match(/\*\*(.+?)\*\*/);
        if (!match) return false;
        const suggested = new Date(match[1]);
        return !isNaN(suggested) && suggested < today;
      });

      const toDelete = [...stalePosts, ...expiredSuggestions];
      await Promise.all(toDelete.map(p => base44.entities.Post.delete(p.id)));

      const remaining = allPosts.filter(p => !toDelete.find(d => d.id === p.id));

      // Enforce max 8 regular/calendar posts — delete oldest beyond limit
      const regularPosts = remaining
        .filter(p => p.post_type === 'regular' || p.post_type === 'calendar_event')
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      if (regularPosts.length > 8) {
        const overflow = regularPosts.slice(0, regularPosts.length - 8);
        await Promise.all(overflow.map(p => base44.entities.Post.delete(p.id)));
        return remaining.filter(p => !overflow.find(o => o.id === p.id));
      }

      return remaining;
    },
    enabled: !!activeCircleId,
  });

  if (!activeCircleId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground text-sm">Join or create a circle first.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Events</h1>
          {activeCircle && (
            <p className="text-xs text-muted-foreground mt-0.5">{activeCircle.name}</p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border h-32 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl mb-3 block">🌿</span>
          <p className="text-muted-foreground text-sm">No posts yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreatePostModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
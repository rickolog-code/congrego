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

      // Clean up any stale completed vote posts (those with the old "✅ Vote passed" marker)
      const stalePosts = allPosts.filter(p => p.post_type === 'vote' && p.content?.includes('✅ Vote passed'));
      await Promise.all(stalePosts.map(p => base44.entities.Post.delete(p.id)));

      // Return only posts from the active circle, excluding completed vote posts
      return allPosts.filter(p => !stalePosts.find(s => s.id === p.id));
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
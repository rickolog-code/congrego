import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { format } from 'date-fns';
import { Plus, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import CircleSwitcher from '@/components/home/CircleSwitcher';
import AvailabilityCard from '@/components/home/AvailabilityCard';
import CreateCircleModal from '@/components/circles/CreateCircleModal';
import JoinCircleModal from '@/components/circles/JoinCircleModal';
import HeaderMenu from '@/components/home/HeaderMenu';

export default function Home() {
  const { user, activeCircle, activeCircleId, myMembership, circles, isLoadingCircles } = useCircle();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showFallbackButtons, setShowFallbackButtons] = useState(false);

  // After 3 seconds of loading, always show the join/create buttons as a fallback
  useEffect(() => {
    if (!isLoadingCircles) {
      setShowFallbackButtons(false);
      return;
    }
    const timer = setTimeout(() => setShowFallbackButtons(true), 3000);
    return () => clearTimeout(timer);
  }, [isLoadingCircles]);

  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleUpdateAvailability = async (status, note) => {
    if (!myMembership) return;
    await base44.entities.CircleMember.update(myMembership.id, {
      availability: status,
      availability_note: note,
      availability_date: today,
    });
    queryClient.invalidateQueries({ queryKey: ['circle-members'] });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Show spinner while circles are loading, with fallback buttons after 3s
  if (isLoadingCircles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-8">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        {showFallbackButtons && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 w-full max-w-xs"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden">
              <img src="https://media.base44.com/images/public/69ff930a3528037ceadeeade/f62f08a69_CongregoLogo-Copy.png" alt="Congrego" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-muted-foreground">Welcome to Congrego! Get started by joining or creating a circle.</p>
            <Button onClick={() => setShowCreate(true)} className="w-full rounded-2xl h-12 text-base font-bold">
              <Plus className="w-5 h-5 mr-2" /> Create a Circle
            </Button>
            <Button variant="outline" onClick={() => setShowJoin(true)} className="w-full rounded-2xl h-12 text-base font-bold">
              <UserPlus className="w-5 h-5 mr-2" /> Join a Circle
            </Button>
            <CreateCircleModal open={showCreate} onOpenChange={setShowCreate} />
            <JoinCircleModal open={showJoin} onOpenChange={setShowJoin} />
          </motion.div>
        )}
      </div>
    );
  }

  // No circles - onboarding
  if (circles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden">
            <img src="https://media.base44.com/images/public/69ff930a3528037ceadeeade/f62f08a69_CongregoLogo-Copy.png" alt="Congrego" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Congrego</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Go further than the group chat.
            </p>
          </div>
          <div className="space-y-3 w-full max-w-xs">
            <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
              <Button
                onClick={() => setShowCreate(true)}
                className="w-full rounded-2xl h-12 text-base font-bold"
              >
                <Plus className="w-5 h-5 mr-2" /> Create a Circle
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
              <Button
                variant="outline"
                onClick={() => setShowJoin(true)}
                className="w-full rounded-2xl h-12 text-base font-bold"
              >
                <UserPlus className="w-5 h-5 mr-2" /> Join a Circle
              </Button>
            </motion.div>
          </div>
        </motion.div>
        <CreateCircleModal open={showCreate} onOpenChange={setShowCreate} />
        <JoinCircleModal open={showJoin} onOpenChange={setShowJoin} />
      </div>
    );
  }

  const MONKEY_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/d6873467d_Monkey.png";
  const TREE_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/2eed85bff_Tree.png";

  return (
    <div className="px-4 pt-6 space-y-5 relative">
      {/* Monkey + vine — absolute top right */}
      <img
        src={MONKEY_IMG}
        alt=""
        className="pointer-events-none absolute top-0 right-0 z-0"
        style={{ width: '90%', maxWidth: 500 }}
      />

      {/* Tree — fixed bottom-left, flush above the nav bar */}
      <img
        src={TREE_IMG}
        alt=""
        className="pointer-events-none fixed left-0 z-0"
        style={{ bottom: '64px', width: '45vw', maxWidth: '240px' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {myMembership?.profile_image ? (
              <img
                src={myMembership.profile_image}
                alt=""
                className="w-11 h-11 rounded-full object-cover"
                style={{ border: `3px solid ${myMembership?.theme_color || '#64B5F6'}` }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center"
                style={{ border: `3px solid ${myMembership?.theme_color || '#64B5F6'}` }}
              >
                <span className="text-base font-bold text-primary">
                  {(user?.full_name || user?.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{greeting()}</p>
            <p className="text-base font-bold">
              {myMembership?.username || user?.full_name || user?.email?.split('@')[0]}
            </p>
          </div>
        </div>
        <HeaderMenu hasRedDot={false} />
      </div>

      {/* Circle Switcher */}
      <CircleSwitcher />

      {/* Tonight Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="text-xs font-medium text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-extrabold">Free tonight?</h2>
          {activeCircle && (
            <span
              className="px-3 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: activeCircle.color || 'hsl(var(--primary))' }}
            >
              {activeCircle.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* Members List */}
      <div className="space-y-2.5 relative z-10">
        <AnimatePresence>
          {members
            .sort((a, b) => (a.user_email === user?.email ? -1 : 1))
            .map((member) => (
              <AvailabilityCard
                key={member.id}
                member={member}
                isMe={member.user_email === user?.email}
                onUpdateAvailability={handleUpdateAvailability}
              />
            ))}
        </AnimatePresence>
      </div>

      <CreateCircleModal open={showCreate} onOpenChange={setShowCreate} />
      <JoinCircleModal open={showJoin} onOpenChange={setShowJoin} />
    </div>
  );
}
import { useCircle } from '@/lib/useCircleContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

// Game achievements are stored in localStorage
function getGameAchievements() {
  try { return JSON.parse(localStorage.getItem('game_achievements') || '{}'); } catch { return {}; }
}
export function unlockGameAchievement(key) {
  const data = getGameAchievements();
  if (!data[key]) { data[key] = new Date().toISOString(); localStorage.setItem('game_achievements', JSON.stringify(data)); }
}

function AchievementRow({ title, description, completed, completedDate, progress, total }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border p-4 space-y-2 ${completed ? 'border-amber-300/60' : 'border-border'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
              {title}
            </span>
            {completed && <span className="text-base">🏆</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {completed && completedDate && (
            <p className="text-[10px] text-amber-600 font-semibold mt-1">
              Completed {format(new Date(completedDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Progress pill */}
        <div className="flex flex-col items-end gap-1.5 min-w-[60px]">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completed ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
            {progress}/{total}
          </span>
          {/* Progress bar */}
          <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-amber-400' : 'bg-primary/40'}`}
              style={{ width: `${Math.min(100, (progress / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const { activeCircle, activeCircleId, circles } = useCircle();
  const navigate = useNavigate();
  const gameAch = getGameAchievements();

  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', activeCircleId],
    queryFn: () => base44.entities.CalendarEvent.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['circle-posts', activeCircleId],
    queryFn: () => base44.entities.Post.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const totalMembers = members.length;

  // Achievement 1: Circle created
  const circleCreated = !!activeCircle;
  const circleCreatedDate = activeCircle?.created_date;

  // Achievement 2: First event made (calendar event or calendar post)
  const calendarPosts = posts.filter(p => p.post_type === 'calendar_event');
  const firstEventMade = events.length > 0 || calendarPosts.length > 0;
  const firstEventDate = events[0]?.created_date || calendarPosts[0]?.created_date;

  // Achievement 3: All calendars synced — track via localStorage flag per user per circle
  // We'll store synced members in circle metadata. For now check member count vs synced.
  const syncedCount = members.filter(m => m.calendar_synced).length;
  const allCalendarsSynced = totalMembers > 0 && syncedCount === totalMembers;

  // Achievement 4: Everyone is online (all members set free today)
  const today = format(new Date(), 'yyyy-MM-dd');
  const freeToday = members.filter(m => m.availability === 'free' && m.availability_date === today).length;
  const everyoneOnline = totalMembers > 0 && freeToday === totalMembers;

  const achievements = [
    {
      title: '5 Heads in a Row! 👑',
      description: 'Flip heads 5 times in a row in Canopy Coin.',
      completed: !!gameAch['five_heads'],
      completedDate: gameAch['five_heads'] || null,
      progress: gameAch['five_heads'] ? 5 : 0,
      total: 5,
    },
    {
      title: 'Perfect Memory! 🌴',
      description: 'Complete Jungle Memory without a single mistake.',
      completed: !!gameAch['perfect_memory'],
      completedDate: gameAch['perfect_memory'] || null,
      progress: gameAch['perfect_memory'] ? 1 : 0,
      total: 1,
    },
    {
      title: 'Safari Sixth Sense! 🐒',
      description: 'Guess the number on your very first try in Safari Guess.',
      completed: !!gameAch['first_try_guess'],
      completedDate: gameAch['first_try_guess'] || null,
      progress: gameAch['first_try_guess'] ? 1 : 0,
      total: 1,
    },
    {
      title: 'Circle created!',
      description: 'The host created this circle.',
      completed: circleCreated,
      completedDate: circleCreatedDate,
      progress: circleCreated ? 1 : 0,
      total: 1,
    },
    {
      title: 'First event made!',
      description: 'Someone posted or scheduled a group event.',
      completed: firstEventMade,
      completedDate: firstEventDate,
      progress: firstEventMade ? 1 : 0,
      total: 1,
    },
    {
      title: 'All calendars are synced!',
      description: 'Every member has synced their calendar.',
      completed: allCalendarsSynced,
      completedDate: null,
      progress: syncedCount,
      total: Math.max(1, totalMembers),
    },
    {
      title: 'Everyone is online!',
      description: 'All members marked themselves as free today.',
      completed: everyoneOnline,
      completedDate: everyoneOnline ? today : null,
      progress: freeToday,
      total: Math.max(1, totalMembers),
    },
  ];

  return (
    <div className="min-h-screen bg-background jungle-bg px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold">Achievements</h1>
          <Trophy className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
        </div>
      </div>

      {activeCircle && (
        <p className="text-xs text-muted-foreground mb-5 font-medium">
          {activeCircle.name}
        </p>
      )}

      <div className="space-y-3">
        {achievements.map((a) => (
          <AchievementRow key={a.title} {...a} />
        ))}
      </div>
    </div>
  );
}
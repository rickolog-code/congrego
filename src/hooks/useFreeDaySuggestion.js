import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Checks the next 14 days for a circle and auto-posts a suggestion
 * if there's a day where ALL members are free (no events for anyone).
 * Picks randomly among qualifying free days.
 * Runs once per circle per day (tracked via localStorage).
 */
export function useFreeDaySuggestion({ circleId, userEmail, userName }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!circleId || !userEmail) return;

    const storageKey = `suggestion_checked_${circleId}_${format(new Date(), 'yyyy-MM-dd')}`;
    if (localStorage.getItem(storageKey)) return;

    const run = async () => {
      const [allEvents, allMembers] = await Promise.all([
        base44.entities.CalendarEvent.filter({ circle_id: circleId }),
        base44.entities.CircleMember.filter({ circle_id: circleId }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const memberEmails = allMembers.map(m => m.user_email);

      // For each day in the next 14 days, check if ALL members are free
      const freeDays = [];
      for (let i = 1; i <= 14; i++) {
        const day = addDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dow = getDay(day);

        const anyBusy = allEvents.some(e => {
          if (e.creator_email && !memberEmails.includes(e.creator_email)) return false;
          // One-time busy
          if (e.event_type === 'busy' && e.event_date === dayStr) return true;
          // Regular event counts as busy for that member
          if (e.event_type === 'event' && e.event_date === dayStr) return true;
          // Recurring busy
          if (e.event_type === 'recurring_busy' && e.busy_days_of_week?.includes(dow)) {
            const rangeStart = e.busy_start_date ? new Date(e.busy_start_date + 'T00:00:00') : new Date(0);
            const rangeEnd = e.busy_end_date ? new Date(e.busy_end_date + 'T00:00:00') : new Date(9999, 0, 1);
            if (day >= rangeStart && day <= rangeEnd) return true;
          }
          return false;
        });

        if (!anyBusy) freeDays.push(dayStr);
      }

      if (freeDays.length === 0) {
        localStorage.setItem(storageKey, '1');
        return;
      }

      // Check if we already have a pending suggestion (not expired)
      const recentPosts = await base44.entities.Post.filter({
        circle_id: circleId,
        post_type: 'suggestion',
      });

      const activeSuggestion = recentPosts.find(p => {
        const match = p.content?.match(/\*\*(.+?)\*\*/);
        if (!match) return false;
        const suggested = new Date(match[1]);
        return !isNaN(suggested) && suggested >= today;
      });

      if (activeSuggestion) {
        localStorage.setItem(storageKey, '1');
        return;
      }

      // Pick a random free day
      const randomDay = freeDays[Math.floor(Math.random() * freeDays.length)];
      const formattedDate = new Date(randomDay + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      await base44.entities.Post.create({
        circle_id: circleId,
        author_email: userEmail,
        author_name: userName || 'Congrego',
        content: `📅 Looks like everyone might be free on **${formattedDate}** — no events planned! Anyone want to get together? 🌿`,
        post_type: 'suggestion',
        upvotes: [],
        downvotes: [],
      });

      queryClient.invalidateQueries({ queryKey: ['circle-posts', circleId] });
      localStorage.setItem(storageKey, '1');
    };

    run();
  }, [circleId, userEmail]);
}
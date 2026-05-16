import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Checks the next 14 days for a circle and auto-posts a suggestion
 * if there are days with no calendar events.
 * Runs once per circle per day (tracked via localStorage).
 */
export function useFreeDaySuggestion({ circleId, userEmail, userName }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!circleId || !userEmail) return;

    const storageKey = `suggestion_checked_${circleId}_${format(new Date(), 'yyyy-MM-dd')}`;
    if (localStorage.getItem(storageKey)) return; // already ran today

    const run = async () => {
      // Get all events in the next 14 days
      const allEvents = await base44.entities.CalendarEvent.filter({ circle_id: circleId });
      const today = new Date();
      const freeDays = [];

      for (let i = 1; i <= 14; i++) {
        const day = addDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const hasEvent = allEvents.some((e) => e.event_date === dayStr);
        if (!hasEvent) freeDays.push(dayStr);
      }

      if (freeDays.length === 0) {
        localStorage.setItem(storageKey, '1');
        return;
      }

      // Check if we already posted a suggestion recently (within last 7 days)
      const recentPosts = await base44.entities.Post.filter({
        circle_id: circleId,
        post_type: 'suggestion',
      });

      const cutoff = format(addDays(today, -7), 'yyyy-MM-dd');
      const recentSuggestion = recentPosts.find(
        (p) => p.created_date && p.created_date.slice(0, 10) >= cutoff
      );

      if (recentSuggestion) {
        localStorage.setItem(storageKey, '1');
        return;
      }

      // Pick the soonest free day
      const soonestFreeDay = freeDays[0];
      const formattedDate = new Date(soonestFreeDay + 'T00:00:00').toLocaleDateString('en-US', {
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
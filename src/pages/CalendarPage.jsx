import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { format, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CreateEventModal from '@/components/calendar/CreateEventModal';

// Stable color palette per user (deterministic by email)
const USER_COLORS = ['#E57373','#F06292','#BA68C8','#64B5F6','#4DB6AC','#81C784','#FFB74D','#A1887F'];
function colorForEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export default function CalendarPage() {
  const { activeCircleId, activeCircle } = useCircle();
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const eventsRef = useRef(null);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', activeCircleId],
    queryFn: () => base44.entities.CalendarEvent.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  // Build per-date user color dots map
  const dotsByDate = {};
  events.forEach((e) => {
    const key = e.event_date; // yyyy-MM-dd
    if (!dotsByDate[key]) dotsByDate[key] = new Set();
    dotsByDate[key].add(colorForEmail(e.creator_email || ''));
  });

  const selectedEvents = selectedDate
    ? events.filter((e) => {
        // Fix: parse as local date to avoid timezone offset issues
        const [y, m, d] = e.event_date.split('-').map(Number);
        return isSameDay(new Date(y, m - 1, d), selectedDate);
      })
    : [];

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Scroll down to event section
    setTimeout(() => {
      eventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (!activeCircleId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground text-sm">Join or create a circle first.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold">Calendar</h1>
        {activeCircle && (
          <p className="text-xs text-muted-foreground mt-0.5">{activeCircle.name}</p>
        )}
      </div>

      <CalendarGrid
        events={events}
        dotsByDate={dotsByDate}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
      />

      {/* Selected Date Section */}
      <div ref={eventsRef}>
        {selectedDate && (
          <div className="space-y-3">
            <h3 className="text-base font-bold">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>

            {/* Create Event Button */}
            <Button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-2xl h-12 text-base font-bold shadow-md shadow-primary/20"
            >
              <Plus className="w-5 h-5 mr-2" /> Create Event
            </Button>

            {/* Events list */}
            <AnimatePresence>
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-primary/20 p-4 space-y-2"
                  >
                    <h4 className="font-bold text-sm">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {event.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {event.event_time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {event.location}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Created by {event.creator_name}
                    </p>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No events on this day.</p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateEventModal
        open={showCreate}
        onOpenChange={setShowCreate}
        selectedDate={selectedDate}
      />
    </div>
  );
}
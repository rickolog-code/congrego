import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { format, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CreateEventModal from '@/components/calendar/CreateEventModal';

export default function CalendarPage() {
  const { activeCircleId, activeCircle } = useCircle();
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', activeCircleId],
    queryFn: () => base44.entities.CalendarEvent.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const selectedEvents = selectedDate
    ? events.filter((e) => isSameDay(new Date(e.event_date), selectedDate))
    : [];

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCreate(true);
  };

  if (!activeCircleId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground text-sm">Join or create a circle first.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Calendar</h1>
        {activeCircle && (
          <p className="text-xs text-muted-foreground mt-0.5">{activeCircle.name}</p>
        )}
      </div>

      <CalendarGrid
        events={events}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
      />

      {/* Events for selected date */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
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
              <p className="text-xs text-muted-foreground">No events. Tap a date to create one.</p>
            )}
          </AnimatePresence>
        </div>
      )}

      <CreateEventModal
        open={showCreate}
        onOpenChange={setShowCreate}
        selectedDate={selectedDate}
      />
    </div>
  );
}
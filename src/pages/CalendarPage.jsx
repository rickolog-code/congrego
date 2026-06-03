import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { format, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CreateEventModal from '@/components/calendar/CreateEventModal';

function cleanTitle(title) {
  return title?.replace(/^\[gcal:[^\]]+\]\s*/, '') || '';
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

  const { data: members = [] } = useQuery({
    queryKey: ['circle-members', activeCircleId],
    queryFn: () => base44.entities.CircleMember.filter({ circle_id: activeCircleId }),
    enabled: !!activeCircleId,
  });

  const colorByEmail = {};
  members.forEach((m) => {
    if (m.user_email && m.theme_color) colorByEmail[m.user_email] = m.theme_color;
  });

  const dotsByDate = {};
  events.forEach((e) => {
    const key = e.event_date;
    if (!dotsByDate[key]) dotsByDate[key] = new Set();
    const color = colorByEmail[e.creator_email] || '#64B5F6';
    dotsByDate[key].add(color);
  });

  const selectedEvents = selectedDate
    ? events.filter((e) => {
        const [y, m, d] = e.event_date.split('-').map(Number);
        return isSameDay(new Date(y, m - 1, d), selectedDate);
      })
    : [];

  const handleDateSelect = (date) => {
    setSelectedDate(date);
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

      {/* Member Color Legend */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: m.theme_color || '#64B5F6' }}
              />
              <span className="text-xs text-muted-foreground">
                {m.username || m.user_email?.split('@')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Date Section */}
      <div ref={eventsRef}>
        {selectedDate && (
          <div className="space-y-3">
            <h3 className="text-base font-bold">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>

            <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
              <Button
                onClick={() => setShowCreate(true)}
                className="w-full rounded-2xl h-12 text-base font-bold shadow-md shadow-primary/20"
              >
                <Plus className="w-5 h-5 mr-2" /> Create Event
              </Button>
            </motion.div>

            <AnimatePresence>
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event) => {
                  const userColor = colorByEmail[event.creator_email] || '#64B5F6';
                  const title = cleanTitle(event.title);
                  const creatorName = event.creator_name || event.creator_email?.split('@')[0] || 'Unknown';

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 p-4 space-y-2 relative overflow-hidden bg-card"
                      style={{ borderColor: userColor }}
                    >
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        <defs>
                          <pattern id={`hatch-card-${event.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="10" stroke={userColor} strokeWidth="1.2" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#hatch-card-${event.id})`} opacity="0.08" />
                      </svg>

                      <div className="relative z-10 space-y-2">
                        <h4 className="font-bold text-base">{title}</h4>
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
                        <p className="text-base font-bold" style={{ color: userColor }}>
                          {creatorName}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
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
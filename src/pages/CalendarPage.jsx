import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { format, isSameDay, eachDayOfInterval, parseISO, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { MapPin, Clock, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import BusyDatePickOverlay from '@/components/calendar/BusyDatePickOverlay';
import EditBusyEventModal from '@/components/calendar/EditBusyEventModal';
import HolidayBadge from '@/components/calendar/HolidayBadge';
import { getHolidays } from '@/lib/holidays';

// Strip internal sync prefixes like [gcal:uid] or [apple:uid]
function cleanTitle(title) {
  return title?.replace(/^\[(gcal|apple):[^\]]+\]\s*/, '') || '';
}

// A synced event is one that came from Google or Apple calendar sync
function isSyncedEvent(title) {
  return /^\[(gcal|apple):/.test(title || '');
}

export default function CalendarPage({ datePickRequest, onOverlayConfirm, onOverlayCancel }) {
  const { activeCircleId, activeCircle, user } = useCircle();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBusyEvent, setEditingBusyEvent] = useState(null);
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
  const privacyByEmail = {};
  members.forEach((m) => {
    if (m.user_email && m.theme_color) colorByEmail[m.user_email] = m.theme_color;
    if (m.user_email) privacyByEmail[m.user_email] = !!m.privacy_mode;
  });

  const dotsByDate = {};
  events.forEach((e) => {
    if (e.event_type === 'busy' || e.event_type === 'recurring_busy') return;
    const key = e.event_date;
    if (!dotsByDate[key]) dotsByDate[key] = new Set();
    const color = colorByEmail[e.creator_email] || '#64B5F6';
    dotsByDate[key].add(color);
  });

  const busyByDate = {};
  const addBusy = (dateStr, email) => {
    if (!busyByDate[dateStr]) busyByDate[dateStr] = [];
    if (!busyByDate[dateStr].includes(email)) busyByDate[dateStr].push(email);
  };

  events.forEach((e) => {
    if (e.event_type === 'busy' && e.event_date) {
      addBusy(e.event_date, e.creator_email);
    } else if (e.event_type === 'recurring_busy' && e.busy_days_of_week?.length) {
      const rangeStart = e.busy_start_date ? parseISO(e.busy_start_date) : new Date();
      const rangeEnd = e.busy_end_date ? parseISO(e.busy_end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 4, 0);
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      days.forEach((day) => {
        if (e.busy_days_of_week.includes(getDay(day))) {
          addBusy(format(day, 'yyyy-MM-dd'), e.creator_email);
        }
      });
    }
    // Synced calendar events: if the creator has privacy mode on, treat as busy on that date
    else if (e.event_type === 'event' && isSyncedEvent(e.title) && privacyByEmail[e.creator_email] && e.creator_email !== user?.email) {
      if (e.event_date) addBusy(e.event_date, e.creator_email);
    }
  });

  const now = new Date();
  const holidays = { ...getHolidays(now.getFullYear()), ...getHolidays(now.getFullYear() + 1) };
  const selectedHoliday = selectedDate ? holidays[format(selectedDate, 'yyyy-MM-dd')] : null;

  const selectedEvents = selectedDate
    ? events.filter((e) => {
        if (e.event_type === 'recurring_busy') return false;
        const [y, m, d] = e.event_date.split('-').map(Number);
        return isSameDay(new Date(y, m - 1, d), selectedDate);
      })
    : [];

  const selectedRecurringBusy = selectedDate
    ? events.filter((e) => {
        if (e.event_type !== 'recurring_busy' || !e.busy_days_of_week?.length) return false;
        const dow = selectedDate.getDay();
        if (!e.busy_days_of_week.includes(dow)) return false;
        const rangeStart = e.busy_start_date ? new Date(e.busy_start_date + 'T00:00:00') : new Date(0);
        const rangeEnd = e.busy_end_date ? new Date(e.busy_end_date + 'T00:00:00') : new Date(9999, 0, 1);
        return selectedDate >= rangeStart && selectedDate <= rangeEnd;
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
    <>
      <div className="px-4 pt-6 space-y-5 pb-8">
        <div>
          <h1 className="text-2xl font-extrabold">Calendar</h1>
          {activeCircle && (
            <p className="text-xs text-muted-foreground mt-0.5">{activeCircle.name}</p>
          )}
        </div>

        {datePickRequest ? (
          <BusyDatePickOverlay
            singleMode={datePickRequest.singleMode}
            members={members}
            onConfirm={onOverlayConfirm}
            onCancel={onOverlayCancel}
          />
        ) : (
          <>
            <CalendarGrid
              events={events}
              dotsByDate={dotsByDate}
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
              busyByDate={busyByDate}
              currentUser={user?.email}
              colorByEmail={colorByEmail}
              holidays={holidays}
            />

            {members.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.theme_color || '#64B5F6' }} />
                    <span className="text-xs text-muted-foreground">{m.username || m.user_email?.split('@')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div ref={eventsRef}>
          {selectedDate && !datePickRequest && (
            <div className="space-y-3">
              <h3 className="text-base font-bold">{format(selectedDate, 'EEEE, MMMM d')}</h3>

              {selectedHoliday && <HolidayBadge holiday={selectedHoliday} />}

              <Button
                onClick={() => setShowCreate(true)}
                className="w-full rounded-2xl h-12 text-base font-bold shadow-md shadow-primary/20"
              >
                <Plus className="w-5 h-5 mr-2" /> Create Event
              </Button>

              <AnimatePresence>
                {selectedEvents.map((event) => {
                  const userColor = colorByEmail[event.creator_email] || '#64B5F6';
                  const creatorName = event.creator_name || event.creator_email?.split('@')[0] || 'Unknown';
                  const isOwner = event.creator_email === user?.email;

                  if (event.event_type === 'busy') {
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex items-center gap-3 relative"
                      >
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: userColor }}>
                          <span className="text-white font-bold text-xs">{creatorName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-red-700">{creatorName} is busy</p>
                          <p className="text-xs text-red-500">
                            {event.busy_all_day ? 'All day' : `${event.busy_time_start || '?'} – ${event.busy_time_end || '?'}`}
                          </p>
                        </div>
                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100">
                                <MoreHorizontal className="w-4 h-4 text-red-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingBusyEvent(event)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit time
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={async () => {
                                  await base44.entities.CalendarEvent.delete(event.id);
                                  queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </motion.div>
                    );
                  }

                  // For synced events from another user with privacy mode on — show as busy
                  const synced = isSyncedEvent(event.title);
                  const isPrivate = !isOwner && (privacyByEmail[event.creator_email] && synced || privacyByEmail[event.creator_email]);
                  const rawTitle = cleanTitle(event.title);
                  const title = isPrivate ? `${creatorName} is busy` : rawTitle;

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
                        {!isPrivate && event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {event.event_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.event_time}</span>}

                          {!isPrivate && event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
                        </div>
                        <p className="text-base font-bold" style={{ color: userColor }}>{creatorName}</p>
                      </div>
                    </motion.div>
                  );
                })}

                {selectedRecurringBusy.map((event) => {
                  const userColor = colorByEmail[event.creator_email] || '#64B5F6';
                  const creatorName = event.creator_name || event.creator_email?.split('@')[0] || 'Unknown';
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: userColor }}>
                        <span className="text-white font-bold text-xs">{creatorName[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-red-700">{creatorName} is busy 🔄</p>
                        <p className="text-xs text-red-500">
                          {event.busy_all_day ? 'All day (recurring)' : `${event.busy_time_start || '?'} – ${event.busy_time_end || '?'} (recurring)`}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {selectedEvents.length === 0 && selectedRecurringBusy.length === 0 && (
                  <p className="text-xs text-muted-foreground">No events on this day.</p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <CreateEventModal open={showCreate} onOpenChange={setShowCreate} selectedDate={selectedDate} />
      </div>

      <EditBusyEventModal
        event={editingBusyEvent}
        open={!!editingBusyEvent}
        onOpenChange={(v) => { if (!v) setEditingBusyEvent(null); }}
      />
    </>
  );
}
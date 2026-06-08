import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CalendarGrid({ events = [], dotsByDate = {}, onDateSelect, selectedDate, busyByDate = {}, currentUser, colorByEmail = {} }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  // Check if a day has an event (using local date parsing to avoid timezone offset)
  const getDotsForDay = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return dotsByDate[key] ? Array.from(dotsByDate[key]) : [];
  };

  // Check if a day has a suggested event (any event on that day = hatched)
  const hasEvent = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return !!dotsByDate[key] && dotsByDate[key].size > 0;
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-4 shadow-sm">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-base font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
          <div key={label} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => {
          const dots = getDotsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasEvents = hasEvent(day);
          const key = format(day, 'yyyy-MM-dd');
          const busyEmails = busyByDate[key] || [];
          const isMeBusy = currentUser && busyEmails.includes(currentUser);

          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDateSelect(day)}
              className={`relative h-10 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all overflow-hidden ${
                !isCurrentMonth
                  ? 'text-muted-foreground/30'
                  : isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {/* Hatch pattern for days with events */}
              {hasEvents && !isSelected && isCurrentMonth && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
                  <defs>
                    <pattern id={`hatch-${idx}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#hatch-${idx})`} />
                </svg>
              )}

              {format(day, 'd')}

              {/* Colored dots per user — events + busy users */}
              {(() => {
                const busyColors = busyEmails.map(email => colorByEmail?.[email] || '#ef4444');
                const allDots = [...new Set([...dots, ...busyColors])];
                return allDots.length > 0 ? (
                  <div className="flex gap-0.5 mt-0.5">
                    {allDots.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: isSelected ? 'white' : color }}
                      />
                    ))}
                  </div>
                ) : null;
              })()}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, isBefore, getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * Full-screen overlay that sits on top of the CalendarPage.
 * Shows a "Choose a date" glowing header and a clean calendar for range/single picking.
 * members legend still shown at bottom (matches the screenshot).
 */
export default function BusyDatePickOverlay({ singleMode, members = [], onConfirm, onCancel }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(endOfMonth(currentMonth));

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const handleDayClick = (day) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (singleMode) {
      setStartDate(day);
      setEndDate(day);
      return;
    }
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else {
      if (isBefore(day, startDate)) {
        setEndDate(startDate);
        setStartDate(day);
      } else {
        setEndDate(day);
      }
    }
  };

  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    return isWithinInterval(day, { start: startDate, end: endDate });
  };
  const isStart = (day) => startDate && isSameDay(day, startDate);
  const isEnd = (day) => endDate && isSameDay(day, endDate);

  const canConfirm = singleMode ? !!startDate : (!!startDate && !!endDate);

  const handleConfirm = () => {
    if (singleMode) onConfirm(startDate, startDate);
    else onConfirm(startDate, endDate);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Glowing "Choose a date" header */}
      <div className="flex-shrink-0 px-4 pt-10 pb-4 text-center relative">
        <button
          onClick={onCancel}
          className="absolute right-4 top-10 p-2 rounded-full hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>
        <h1
          className="text-4xl font-extrabold"
          style={{
            color: '#f59e0b',
            textShadow: '0 0 20px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.4)',
          }}
        >
          Choose a date
        </h1>
        {!singleMode && (
          <p className="text-xs text-muted-foreground mt-1">
            {!startDate ? 'Tap start date' : !endDate ? 'Tap end date' : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`}
          </p>
        )}
      </div>

      {/* Calendar with golden border */}
      <div className="flex-1 px-4 overflow-auto">
        <div
          className="bg-card rounded-3xl p-4"
          style={{
            border: '2.5px solid #f59e0b',
            boxShadow: '0 0 24px 6px rgba(245,158,11,0.35)',
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((l) => (
              <div key={l} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{l}</div>
            ))}
          </div>

          {/* Days — no gap so shapes connect */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const inRange = isInRange(day);
              const isS = isStart(day);
              const isE = isEnd(day);
              const isSingle = isS && (singleMode || isSameDay(startDate, endDate));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const dow = getDay(day);
              const isFirstOfRow = dow === 0;
              const isLastOfRow = dow === 6;

              // Connected pill shape: round outer edges, square inner
              let borderRadius = '0.75rem';
              if (!singleMode && (isS || isE || inRange)) {
                if (isSingle) borderRadius = '0.75rem';
                else if (isS) borderRadius = '0.75rem 0 0 0.75rem';
                else if (isE) borderRadius = '0 0.75rem 0.75rem 0';
                else if (inRange) {
                  borderRadius = isFirstOfRow ? '0.75rem 0 0 0.75rem' : isLastOfRow ? '0 0.75rem 0.75rem 0' : '0';
                }
              }

              const isAnySelected = isS || isE || (singleMode && isS);

              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleDayClick(day)}
                  style={{ borderRadius }}
                  className={`relative h-11 text-sm font-medium flex items-center justify-center transition-all
                    ${!isCurrentMonth ? 'text-muted-foreground/30 pointer-events-none' : ''}
                    ${inRange && !isAnySelected ? 'bg-red-50' : ''}
                    ${!inRange && !isAnySelected && isCurrentMonth ? (isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground') : ''}
                  `}
                >
                  {/* Red fill bar connecting range — full width for middle, half for ends */}
                  {(isS || isE || inRange) && isCurrentMonth && !isSingle && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-8 bg-red-100 pointer-events-none"
                      style={{
                        left: isS ? '50%' : '0',
                        right: isE ? '50%' : '0',
                      }}
                    />
                  )}

                  {/* Red outlined circle for start/end */}
                  {isAnySelected && isCurrentMonth && (
                    <div
                      className="absolute inset-1 rounded-xl pointer-events-none"
                      style={{
                        border: '2px solid #ef4444',
                        boxShadow: '0 0 8px 2px rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.08)',
                      }}
                    />
                  )}

                  {/* Red strikethrough line */}
                  {(isS || isE || inRange) && isCurrentMonth && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top: '50%',
                        height: '2px',
                        background: '#ef4444',
                        opacity: 0.6,
                      }}
                    />
                  )}

                  <span className={`relative z-10 ${isAnySelected ? 'text-red-600 font-bold' : inRange ? 'text-red-500' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Member legend */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-3 px-1 mt-4">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: m.theme_color || '#64B5F6' }} />
                <span className="text-xs text-muted-foreground">{m.username || m.user_email?.split('@')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm button */}
      <div className="flex-shrink-0 px-4 py-4 pb-8">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full h-12 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white"
        >
          Confirm
        </Button>
      </div>
    </motion.div>
  );
}
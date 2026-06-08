import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, isBefore, getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * Inline calendar for picking a single date or a date range.
 * Shows a golden glow around the calendar border.
 * Renders inside the parent modal — no extra Dialog wrapper.
 *
 * Props:
 *   singleMode   – pick one date (calls onConfirm(date))
 *   onConfirm    – (start, end?) => void
 *   onCancel     – () => void
 *   label        – optional string shown above calendar
 */
export default function DateRangePicker({ onConfirm, onCancel, singleMode = false, label }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const handleDayClick = (day) => {
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

  const handleConfirm = () => {
    if (singleMode && startDate) {
      onConfirm(startDate);
    } else if (startDate && endDate) {
      onConfirm(startDate, endDate);
    }
  };

  const canConfirm = singleMode ? !!startDate : (!!startDate && !!endDate);

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}

      {/* Golden-glowing calendar border */}
      <div
        className="rounded-2xl p-3"
        style={{
          border: '2px solid #f59e0b',
          boxShadow: '0 0 18px 4px rgba(245,158,11,0.35)',
        }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((l) => (
            <div key={l} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{l}</div>
          ))}
        </div>

        {/* Days grid — no gap so range shapes connect */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const inRange = isInRange(day);
            const isS = isStart(day);
            const isE = isEnd(day);
            const isSingle = isS && isE;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            // Figure out which day of week (0=Sun,6=Sat) for edge rounding
            const dow = getDay(day);
            const isFirstOfRow = dow === 0;
            const isLastOfRow = dow === 6;

            // Border-radius: round outer edges of start/end, square inner edges
            let borderRadius = '0.75rem'; // default rounded for non-range days
            if (isS && !isSingle) borderRadius = '0.75rem 0 0 0.75rem';
            if (isE && !isSingle) borderRadius = '0 0.75rem 0.75rem 0';
            if (isSingle) borderRadius = '0.75rem';
            if (inRange && !isS && !isE) {
              borderRadius = isFirstOfRow ? '0.75rem 0 0 0.75rem' : isLastOfRow ? '0 0.75rem 0.75rem 0' : '0';
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.9 }}
                onClick={() => isCurrentMonth && handleDayClick(day)}
                style={{ borderRadius }}
                className={`relative h-10 text-xs font-medium flex flex-col items-center justify-center transition-all overflow-hidden
                  ${!isCurrentMonth ? 'text-muted-foreground/30 pointer-events-none' : ''}
                  ${inRange ? 'bg-red-50' : ''}
                  ${!inRange && !isS && !isE && isCurrentMonth ? (isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground') : ''}
                `}
              >
                {/* Red through-line for ALL range days including start/end */}
                {(isS || isE || inRange) && isCurrentMonth && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    {/* Extend line to edges for range continuity */}
                    <line
                      x1={isS && !isSingle ? '50%' : '0'}
                      y1="50%"
                      x2={isE && !isSingle ? '50%' : '100%'}
                      y2="50%"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                    />
                  </svg>
                )}

                {/* Glowing red circle outline for start and end */}
                {(isS || isE) && isCurrentMonth && (
                  <div
                    className="absolute inset-0.5 rounded-xl pointer-events-none"
                    style={{
                      border: '2px solid #ef4444',
                      boxShadow: '0 0 8px 2px rgba(239,68,68,0.5)',
                    }}
                  />
                )}

                <span className={`relative z-10 ${(isS || isE) && !inRange ? 'font-bold text-red-600' : inRange && !isS && !isE ? 'text-red-500' : ''}`}>
                  {format(day, 'd')}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {!singleMode && (
        <p className="text-xs text-center text-muted-foreground">
          {!startDate ? 'Tap a start date' : !endDate ? 'Tap an end date' : `${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d')}`}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            Back
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
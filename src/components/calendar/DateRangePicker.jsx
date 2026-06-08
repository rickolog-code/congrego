import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, isAfter, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DateRangePicker({ open, onOpenChange, onConfirm, singleMode = false }) {
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
    setStartDate(null);
    setEndDate(null);
    onOpenChange(false);
  };

  const canConfirm = singleMode ? !!startDate : (!!startDate && !!endDate);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setStartDate(null); setEndDate(null); } onOpenChange(v); }}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-extrabold">
            {singleMode ? 'Select Date' : 'Select Date Range'}
          </DialogTitle>
        </DialogHeader>

        {/* Golden glow border indicator */}
        <div className="rounded-2xl border-2 border-amber-400 shadow-[0_0_16px_4px_rgba(251,191,36,0.3)] p-3">
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

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, idx) => {
              const inRange = isInRange(day);
              const isS = isStart(day);
              const isE = isEnd(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => isCurrentMonth && handleDayClick(day)}
                  className={`relative h-10 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all overflow-hidden
                    ${!isCurrentMonth ? 'text-muted-foreground/30 pointer-events-none' : ''}
                    ${isS || isE ? 'bg-red-500 text-white' : ''}
                    ${inRange && !isS && !isE ? 'bg-red-100 text-red-700' : ''}
                    ${!inRange && !isS && !isE && isCurrentMonth ? (isToday ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground') : ''}
                  `}
                >
                  {/* Red slash for range days */}
                  {inRange && !isS && !isE && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ef4444" strokeWidth="2" />
                    </svg>
                  )}
                  {format(day, 'd')}
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

        <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white">
          Confirm dates
        </Button>
      </DialogContent>
    </Dialog>
  );
}
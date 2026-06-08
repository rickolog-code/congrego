import { useState, useRef, useEffect, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, isBefore
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function BusyDatePickOverlay({ singleMode, members = [], onConfirm, onCancel }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const gridRef = useRef(null);
  const [gridRect, setGridRect] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  // Measure grid after render
  useEffect(() => {
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      setGridRect({ width: rect.width, height: rect.height });
    }
  });

  const handleDayClick = (day) => {
    if (!isSameMonth(day, currentMonth)) return;
    if (singleMode) { setStartDate(day); setEndDate(day); return; }
    if (!startDate || (startDate && endDate)) {
      setStartDate(day); setEndDate(null);
    } else {
      if (isBefore(day, startDate)) { setEndDate(startDate); setStartDate(day); }
      else setEndDate(day);
    }
  };

  const isInRange = (day) => startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
  const isStart = (day) => startDate && isSameDay(day, startDate);
  const isEnd = (day) => endDate && isSameDay(day, endDate);
  const canConfirm = singleMode ? !!startDate : (!!startDate && !!endDate);

  // Build pill rects in real pixels for each row segment of selected range
  const buildPills = useCallback(() => {
    if (!startDate || !endDate || !gridRect) return [];
    const cellW = gridRect.width / 7;
    const cellH = gridRect.height / Math.ceil(days.length / 7);
    const r = 14; // pill corner radius in px
    const pad = 3; // vertical inset so pill is smaller than full cell height

    const pills = [];
    for (let row = 0; row < Math.ceil(days.length / 7); row++) {
      let segStart = null;
      let segEnd = null;
      for (let col = 0; col < 7; col++) {
        const day = days[row * 7 + col];
        if (!day) continue;
        if (isInRange(day) && isSameMonth(day, currentMonth)) {
          if (segStart === null) segStart = col;
          segEnd = col;
        }
      }
      if (segStart !== null) {
        pills.push({
          x: segStart * cellW,
          y: row * cellH + pad,
          w: (segEnd - segStart + 1) * cellW,
          h: cellH - pad * 2,
          r,
        });
      }
    }
    return pills;
  }, [startDate, endDate, gridRect, days, currentMonth]);

  const pills = buildPills();

  return (
    <div className="space-y-4">
      {/* Golden-bordered calendar card — same style as normal CalendarGrid */}
      <div
        className="bg-card rounded-3xl p-4"
        style={{
          border: '2.5px solid #f59e0b',
          boxShadow: '0 0 28px 8px rgba(245,158,11,0.35)',
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
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((l) => (
            <div key={l} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{l}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative" ref={gridRef}>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const inRange = isInRange(day);
              const isS = isStart(day);
              const isE = isEnd(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = isS || isE;

              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDayClick(day)}
                  className={`relative h-11 text-sm font-medium flex items-center justify-center transition-colors
                    ${!isCurrentMonth ? 'text-muted-foreground/30 pointer-events-none' : ''}
                    ${(inRange || isSelected) && isCurrentMonth ? 'text-red-600 font-semibold' : ''}
                    ${!inRange && !isSelected && isCurrentMonth ? (isToday ? 'font-bold' : 'text-foreground hover:bg-muted') : ''}
                  `}
                  style={isToday && !isSelected && !inRange ? { color: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.18)', borderRadius: '0.75rem' } : {}}
                >
                  {format(day, 'd')}
                </motion.button>
              );
            })}
          </div>

          {/* Pill outlines — one per row segment, pixel-perfect */}
          {pills.length > 0 && gridRect && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              width={gridRect.width}
              height={gridRect.height}
            >
              <defs>
                <filter id="red-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {pills.map((p, i) => {
                  const midY = p.y + p.h / 2;
                  return (
                    <g key={i}>
                      {/* Pill outline */}
                      <rect
                        x={p.x + 2}
                        y={p.y}
                        width={p.w - 4}
                        height={p.h}
                        rx={p.r}
                        ry={p.r}
                        fill="rgba(239,68,68,0.07)"
                        stroke="#ef4444"
                        strokeWidth="2"
                        filter="url(#red-glow)"
                      />
                      {/* Glowing horizontal slash through the middle */}
                      <line
                        x1={p.x + 2}
                        y1={midY}
                        x2={p.x + p.w - 2}
                        y2={midY}
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        filter="url(#red-glow)"
                        opacity="0.7"
                      />
                    </g>
                  );
                })}
            </svg>
          )}
        </div>
      </div>

      {/* Member legend */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: m.theme_color || '#64B5F6' }} />
              <span className="text-xs text-muted-foreground">{m.username || m.user_email?.split('@')[0]}</span>
            </div>
          ))}
        </div>
      )}

      {!singleMode && (startDate || endDate) && (
        <p className="text-xs text-center text-muted-foreground -mt-1">
          {!startDate ? 'Tap start date' : !endDate ? 'Tap end date' : `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`}
        </p>
      )}

      {/* Confirm / Cancel */}
      <div className="flex gap-3 pb-4">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-2xl font-bold">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(startDate, endDate || startDate)}
          disabled={!canConfirm}
          className="flex-1 h-12 rounded-2xl font-bold bg-green-600 hover:bg-green-700 text-white"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
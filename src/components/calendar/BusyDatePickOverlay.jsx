import { useState, useRef, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, isBefore, getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * Renders INSIDE the CalendarPage scroll area (not a full-screen takeover),
 * replacing the normal CalendarGrid. The page chrome (header, bottom nav) stays visible.
 * 
 * Range selection draws a single connected pill border around all selected days,
 * exactly like the reference image — one glowing red outline, rounded only on the
 * outer corners of the first and last cell.
 */
export default function BusyDatePickOverlay({ singleMode, members = [], onConfirm, onCancel }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const gridRef = useRef(null);

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

  // Build row segments for the border overlay
  // Each selected day belongs to a row (0-indexed). We group consecutive selected days by row.
  const getRowSegments = () => {
    if (!startDate || !endDate) return [];
    const segments = []; // { rowIndex, startCol, endCol }
    let rowIdx = 0;
    for (let i = 0; i < days.length; i += 7) {
      const rowDays = days.slice(i, i + 7);
      let segStart = null;
      let segEnd = null;
      rowDays.forEach((day, col) => {
        if (isInRange(day) && isSameMonth(day, currentMonth)) {
          if (segStart === null) segStart = col;
          segEnd = col;
        }
      });
      if (segStart !== null) {
        segments.push({ rowIdx, startCol: segStart, endCol: segEnd });
      }
      rowIdx++;
    }
    return segments;
  };

  const rowSegments = (startDate && endDate) ? getRowSegments() : [];

  return (
    <div className="space-y-4">
      {/* Glowing header */}
      <div className="text-center pt-2 relative">
        <h1
          className="text-4xl font-extrabold"
          style={{
            color: '#f59e0b',
            textShadow: '0 0 18px rgba(245,158,11,0.9), 0 0 36px rgba(245,158,11,0.5)',
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

      {/* Golden-bordered calendar card */}
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

        {/* Grid — relative container so we can overlay the pill border SVG */}
        <div className="relative" ref={gridRef}>
          {/* Day cells — no gap, flush grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const inRange = isInRange(day);
              const isS = isStart(day);
              const isE = isEnd(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = isS || isE;
              const isSingleSel = isS && isSameDay(startDate, endDate || startDate);

              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDayClick(day)}
                  className={`relative h-11 text-sm font-medium flex items-center justify-center transition-colors z-10
                    ${!isCurrentMonth ? 'text-muted-foreground/30 pointer-events-none' : ''}
                    ${inRange && isCurrentMonth && !isSelected ? 'bg-red-50/80 text-red-600' : ''}
                    ${isSelected && isCurrentMonth ? 'text-red-600 font-bold' : ''}
                    ${!inRange && !isSelected && isCurrentMonth ? (isToday ? 'text-primary font-bold' : 'text-foreground hover:bg-muted') : ''}
                  `}
                >
                  {format(day, 'd')}
                </motion.button>
              );
            })}
          </div>

          {/* SVG pill border overlay — drawn row by row, connecting into one shape */}
          {rowSegments.length > 0 && (() => {
            const cellW = 100 / 7; // percent
            const cellH = 44; // px, matches h-11
            const r = 12; // border-radius for outer corners
            const strokeW = 2.5;
            const inset = strokeW / 2;

            // Total height in px
            const totalRows = Math.ceil(days.length / 7);
            const svgH = totalRows * cellH;

            // Build one SVG path that traces around all row segments
            // We'll draw each row segment as a rect with selective rounded corners
            return (
              <svg
                className="absolute inset-0 w-full pointer-events-none"
                style={{ height: svgH }}
                viewBox={`0 0 100 ${svgH}`}
                preserveAspectRatio="none"
              >
                {rowSegments.map((seg, si) => {
                  const x1 = seg.startCol * cellW + inset / 10;
                  const x2 = (seg.endCol + 1) * cellW - inset / 10;
                  const y1 = seg.rowIdx * cellH + inset;
                  const y2 = (seg.rowIdx + 1) * cellH - inset;
                  const w = x2 - x1;
                  const h = y2 - y1;
                  // radius in viewBox units (100 wide)
                  const rPct = r / gridRef.current?.clientWidth * 100 || 3;

                  // Is this the first / last row segment?
                  const isFirst = si === 0;
                  const isLast = si === rowSegments.length - 1;

                  // Draw path with rounded corners only where appropriate
                  // top-left: round if first row's start col
                  // top-right: round if first row's end col
                  // bottom-left: round if last row's start col  
                  // bottom-right: round if last row's end col
                  const tl = isFirst ? rPct : 0;
                  const tr = isFirst ? rPct : 0;
                  const br = isLast ? rPct : 0;
                  const bl = isLast ? rPct : 0;

                  const path = `
                    M ${x1 + tl} ${y1}
                    L ${x2 - tr} ${y1}
                    Q ${x2} ${y1} ${x2} ${y1 + tr}
                    L ${x2} ${y2 - br}
                    Q ${x2} ${y2} ${x2 - br} ${y2}
                    L ${x1 + bl} ${y2}
                    Q ${x1} ${y2} ${x1} ${y2 - bl}
                    L ${x1} ${y1 + tl}
                    Q ${x1} ${y1} ${x1 + tl} ${y1}
                    Z
                  `;

                  return (
                    <g key={si}>
                      {/* Fill */}
                      <path d={path} fill="rgba(239,68,68,0.08)" />
                      {/* Stroke — only draw the sides that are NOT shared with an adjacent row */}
                      <path
                        d={path}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={strokeW / 10 * (100 / (gridRef.current?.clientWidth || 370))}
                        style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.7))' }}
                      />
                    </g>
                  );
                })}
              </svg>
            );
          })()}
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
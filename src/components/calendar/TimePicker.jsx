import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function angleFromCenter(cx, cy, x, y) {
  const dx = x - cx;
  const dy = y - cy;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  return angle;
}

export default function TimePicker({ open, onOpenChange, onConfirm }) {
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute'
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState('PM');
  const svgRef = useRef(null);
  const dragging = useRef(false);

  const cx = 120, cy = 120, r = 100, handR = 85, numR = 80;

  const hourAngle = ((hour % 12) / 12) * 360;
  const minuteAngle = (minute / 60) * 360;
  const currentAngle = mode === 'hour' ? hourAngle : minuteAngle;
  const handEnd = polarToCartesian(cx, cy, handR, currentAngle);

  const handleSvgInteraction = useCallback((clientX, clientY) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 240 / rect.width;
    const scaleY = 240 / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const angle = angleFromCenter(cx, cy, x, y);

    if (mode === 'hour') {
      const h = Math.round((angle / 360) * 12) % 12 || 12;
      setHour(h);
    } else {
      const m = Math.round((angle / 360) * 60) % 60;
      setMinute(m);
    }
  }, [mode]);

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    handleSvgInteraction(e.clientX, e.clientY);
  }, [handleSvgInteraction]);

  const onTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    handleSvgInteraction(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleSvgInteraction]);

  useEffect(() => {
    window.addEventListener('mouseup', () => { dragging.current = false; });
    window.addEventListener('touchend', () => { dragging.current = false; });
    return () => {
      window.removeEventListener('mouseup', () => { dragging.current = false; });
      window.removeEventListener('touchend', () => { dragging.current = false; });
    };
  }, []);

  const handleConfirm = () => {
    const h = ampm === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const timeStr = `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;
    onConfirm(timeStr);
    onOpenChange(false);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteMarkers = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-xs mx-auto">
        <DialogHeader>
          <DialogTitle className="font-nunito text-center">Select Time</DialogTitle>
        </DialogHeader>

        {/* Time display */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <button
            onClick={() => setMode('hour')}
            className={`text-4xl font-bold transition-colors rounded-xl px-2 py-1 ${mode === 'hour' ? 'text-primary bg-primary/10' : 'text-foreground/50'}`}
          >
            {String(hour).padStart(2, '0')}
          </button>
          <span className="text-4xl font-bold text-foreground/40">:</span>
          <button
            onClick={() => setMode('minute')}
            className={`text-4xl font-bold transition-colors rounded-xl px-2 py-1 ${mode === 'minute' ? 'text-primary bg-primary/10' : 'text-foreground/50'}`}
          >
            {String(minute).padStart(2, '0')}
          </button>
          <div className="flex flex-col ml-2 gap-1">
            {['AM', 'PM'].map((p) => (
              <button
                key={p}
                onClick={() => setAmpm(p)}
                className={`text-sm font-bold px-2 py-0.5 rounded-lg transition-colors ${ampm === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Clock face */}
        <div className="flex justify-center">
          <svg
            ref={svgRef}
            viewBox="0 0 240 240"
            className="w-56 h-56 cursor-pointer select-none"
            onMouseDown={(e) => { dragging.current = true; handleSvgInteraction(e.clientX, e.clientY); }}
            onMouseMove={onMouseMove}
            onTouchStart={(e) => { dragging.current = true; handleSvgInteraction(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchMove={onTouchMove}
          >
            {/* Clock background */}
            <circle cx={cx} cy={cy} r={r + 10} fill="hsl(var(--muted))" />

            {/* Hand */}
            <line
              x1={cx} y1={cy}
              x2={handEnd.x} y2={handEnd.y}
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />
            {/* Hand end dot */}
            <circle cx={handEnd.x} cy={handEnd.y} r={8} fill="hsl(var(--primary))" />

            {/* Hour numbers */}
            {mode === 'hour' && hours.map((h) => {
              const ang = (h / 12) * 360;
              const pos = polarToCartesian(cx, cy, numR, ang);
              const isActive = h === hour;
              return (
                <text
                  key={h}
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight={isActive ? 'bold' : 'normal'}
                  fill={isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                >
                  {h}
                </text>
              );
            })}

            {/* Minute markers */}
            {mode === 'minute' && minuteMarkers.map((m) => {
              const ang = (m / 60) * 360;
              const pos = polarToCartesian(cx, cy, numR, ang);
              const isActive = m === minute;
              return (
                <text
                  key={m}
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight={isActive ? 'bold' : 'normal'}
                  fill={isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                >
                  {String(m).padStart(2, '0')}
                </text>
              );
            })}
          </svg>
        </div>

        <Button onClick={handleConfirm} className="w-full rounded-xl h-11">
          Confirm {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {ampm}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
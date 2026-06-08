import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { CalendarPlus } from 'lucide-react';
import RecurringBusyModal from './RecurringBusyModal';
import SetBusyTimeModal from './SetBusyTimeModal';

export default function SetBusyButton({ onRequestDatePick }) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [showSubtabs, setShowSubtabs] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showBusyTime, setShowBusyTime] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);

  // Motion values for position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Velocity for warp effect
  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  // Spring-based position for smooth snappy feel
  const springConfig = { stiffness: 400, damping: 22, mass: 0.8 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Warp/squish: scale X based on horizontal velocity (elastic warp)
  const scaleX = useTransform(xVelocity, [-2000, 0, 2000], [0.72, 1, 0.72]);
  const scaleY = useTransform(xVelocity, [-2000, 0, 2000], [1.28, 1, 1.28]);

  // Additional vertical squish from y velocity
  const scaleYFromVY = useTransform(yVelocity, [-2000, 0, 2000], [0.72, 1, 0.72]);
  const scaleXFromVY = useTransform(yVelocity, [-2000, 0, 2000], [1.28, 1, 1.28]);

  // Combine both axes — pick whichever gives more warp
  const combinedScaleX = useTransform(
    [scaleX, scaleXFromVY],
    ([sx, sxvy]) => Math.min(sx, sxvy)
  );
  const combinedScaleY = useTransform(
    [scaleY, scaleYFromVY],
    ([sy, syvy]) => Math.min(sy, syvy)
  );

  // Slight rotation based on x velocity (whiplash tilt)
  const rotate = useTransform(xVelocity, [-2000, 0, 2000], [-18, 0, 18]);

  useEffect(() => {
    setShowTooltip(true);
    const t = setTimeout(() => setShowTooltip(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const handleDragStart = (_, info) => {
    setIsDragging(true);
    dragStartPos.current = { x: info.point.x, y: info.point.y };
    dragMoved.current = false;
  };

  const handleDrag = (_, info) => {
    const dx = Math.abs(info.point.x - dragStartPos.current.x);
    const dy = Math.abs(info.point.y - dragStartPos.current.y);
    if (dx > 5 || dy > 5) dragMoved.current = true;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (dragMoved.current) return; // don't open if user was dragging
    setShowSubtabs((v) => !v);
  };

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.18}
        style={{ x, y, position: 'fixed', bottom: 96, right: 16, zIndex: 30 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="flex flex-col items-end gap-2"
      >
        <AnimatePresence>
          {showTooltip && !showSubtabs && !isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.3 }}
              className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none"
            >
              Set busy time / recurring
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSubtabs && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-end gap-2 mb-1"
            >
              <button
                onClick={() => { setShowSubtabs(false); setShowRecurring(true); }}
                className="bg-card border-2 border-primary text-primary text-xs font-bold px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap"
              >
                🔄 Set recurring busy time
              </button>
              <button
                onClick={() => { setShowSubtabs(false); setShowBusyTime(true); }}
                className="bg-card border-2 border-primary text-primary text-xs font-bold px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap"
              >
                📅 Set a busy time
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The draggable FAB with warp + whiplash */}
        <motion.button
          onClick={handleClick}
          style={{
            scaleX: combinedScaleX,
            scaleY: combinedScaleY,
            rotate,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          whileTap={!isDragging ? { scale: 0.88 } : {}}
          animate={isDragging ? { boxShadow: '0 12px 40px 6px rgba(var(--primary-rgb, 34,85,51),0.45)' } : {}}
          transition={{ type: 'spring', stiffness: 350, damping: 18 }}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 select-none"
        >
          <motion.div
            animate={isDragging ? { rotate: [0, -8, 8, -5, 0] } : { rotate: 0 }}
            transition={{ duration: 0.4, repeat: isDragging ? Infinity : 0, repeatDelay: 0.6 }}
          >
            <CalendarPlus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </motion.div>

      <RecurringBusyModal
        open={showRecurring}
        onOpenChange={setShowRecurring}
        onRequestDatePick={onRequestDatePick}
      />
      <SetBusyTimeModal
        open={showBusyTime}
        onOpenChange={setShowBusyTime}
        onRequestDatePick={onRequestDatePick}
      />
    </>
  );
}
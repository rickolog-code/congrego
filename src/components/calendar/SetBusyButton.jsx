import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useVelocity } from 'framer-motion';
import { CalendarPlus } from 'lucide-react';
import RecurringBusyModal from './RecurringBusyModal';
import SetBusyTimeModal from './SetBusyTimeModal';

export default function SetBusyButton({ onRequestDatePick }) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [showSubtabs, setShowSubtabs] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showBusyTime, setShowBusyTime] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragMoved = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Velocity for warp
  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  // Elastic squish based on velocity
  const scaleX = useTransform(xVelocity, [-1800, 0, 1800], [0.75, 1, 0.75]);
  const scaleY = useTransform(xVelocity, [-1800, 0, 1800], [1.25, 1, 1.25]);
  const rotate = useTransform(xVelocity, [-1800, 0, 1800], [-15, 0, 15]);

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const handleDragStart = () => {
    setIsDragging(true);
    dragMoved.current = false;
  };

  const handleDrag = (_, info) => {
    if (Math.abs(info.delta.x) > 2 || Math.abs(info.delta.y) > 2) {
      dragMoved.current = true;
    }
  };

  const handleDragEnd = () => {
    // Small delay so the click event sees dragMoved=true and ignores it
    setTimeout(() => {
      setIsDragging(false);
      dragMoved.current = false;
    }, 50);
  };

  const handleClick = () => {
    if (dragMoved.current) return;
    setShowSubtabs((v) => !v);
  };

  return (
    <>
      <motion.div
        drag
        dragMomentum={true}
        dragElastic={0.12}
        dragTransition={{
          power: 0.4,
          timeConstant: 280,
          bounceDamping: 18,
          bounceStiffness: 200,
        }}
        style={{ x, y, position: 'fixed', bottom: 96, right: 16, zIndex: 30 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="flex flex-col items-end gap-2 touch-none"
      >
        {/* Tooltip */}
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

        {/* Sub-menu buttons */}
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

        {/* Main FAB — warp only, no size change */}
        <motion.button
          onClick={handleClick}
          style={{ scaleX, scaleY, rotate }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 select-none touch-none"
        >
          <CalendarPlus className="w-6 h-6" />
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
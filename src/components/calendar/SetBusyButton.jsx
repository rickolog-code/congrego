import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { CalendarPlus } from 'lucide-react';
import RecurringBusyModal from './RecurringBusyModal';
import SetBusyTimeModal from './SetBusyTimeModal';

const BTN_SIZE = 56; // w-14 h-14 = 56px

export default function SetBusyButton({ onRequestDatePick }) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [showSubtabs, setShowSubtabs] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showBusyTime, setShowBusyTime] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [constraints, setConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  const dragMoved = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Calculate drag constraints based on window size and button's default position
  // Default position: bottom: 96, right: 16 → from top-left origin:
  //   defaultLeft = window.innerWidth - 16 - BTN_SIZE
  //   defaultTop  = window.innerHeight - 96 - BTN_SIZE
  // Constraints are relative offsets from that default position
  useEffect(() => {
    const update = () => {
      const defaultLeft = window.innerWidth - 16 - BTN_SIZE;
      const defaultTop = window.innerHeight - 96 - BTN_SIZE;
      setConstraints({
        left: -defaultLeft,           // can't go past left edge
        right: window.innerWidth - defaultLeft - BTN_SIZE,  // can't go past right edge
        top: -defaultTop,             // can't go past top edge
        bottom: window.innerHeight - defaultTop - BTN_SIZE, // can't go past bottom edge
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
        dragElastic={0.08}
        dragConstraints={constraints}
        dragTransition={{
          power: 0.3,
          timeConstant: 250,
          bounceDamping: 20,
          bounceStiffness: 300,
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

        {/* Main FAB — no scale transforms, purely visual */}
        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.92 }}
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
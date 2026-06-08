import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus } from 'lucide-react';
import RecurringBusyModal from './RecurringBusyModal';
import SetBusyTimeModal from './SetBusyTimeModal';

export default function SetBusyButton({ onRequestDatePick, pendingDatePick, onClearPending }) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [showSubtabs, setShowSubtabs] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showBusyTime, setShowBusyTime] = useState(false);

  // Show tooltip on mount, fade after 2s
  useEffect(() => {
    setShowTooltip(true);
    const t = setTimeout(() => setShowTooltip(false), 2200);
    return () => clearTimeout(t);
  }, []);

  // When a date pick result comes back, re-open the right modal
  useEffect(() => {
    if (pendingDatePick) {
      if (pendingDatePick.for === 'recurring') setShowRecurring(true);
      if (pendingDatePick.for === 'busy') setShowBusyTime(true);
      onClearPending();
    }
  }, [pendingDatePick]);

  return (
    <>
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2">
        {/* Tooltip label */}
        <AnimatePresence>
          {showTooltip && !showSubtabs && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.3 }}
              className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap"
            >
              Set busy time / recurring
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtab options */}
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
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                🔄 Set recurring busy time
              </button>
              <button
                onClick={() => { setShowSubtabs(false); setShowBusyTime(true); }}
                className="bg-card border-2 border-primary text-primary text-xs font-bold px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                📅 Set a busy time
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSubtabs((v) => !v)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30"
        >
          <CalendarPlus className="w-6 h-6" />
        </motion.button>
      </div>

      <RecurringBusyModal open={showRecurring} onOpenChange={setShowRecurring} />
      <SetBusyTimeModal open={showBusyTime} onOpenChange={setShowBusyTime} />
    </>
  );
}
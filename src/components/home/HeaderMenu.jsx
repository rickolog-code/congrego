import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Settings, Trophy, Bell, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeaderMenu({ hasRedDot }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" style={{ marginTop: '-36px', marginRight: '8px' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
        {hasRedDot && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-12 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[160px]"
            >
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 hover:bg-muted transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
                {hasRedDot && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
              <Link
                to="/achievements"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 hover:bg-muted transition-colors text-sm font-medium border-t border-border"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Achievements
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
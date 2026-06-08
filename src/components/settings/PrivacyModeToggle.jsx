import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

const IncognitoIcon = ({ color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    {/* Hat brim */}
    <ellipse cx="50" cy="42" rx="40" ry="9" />
    {/* Hat top */}
    <path d="M22 42 Q18 20 50 18 Q82 20 78 42" />
    {/* Mask */}
    <path d="M18 65 Q18 55 30 55 Q38 55 40 62 Q43 68 50 68 Q57 68 60 62 Q62 55 70 55 Q82 55 82 65 Q82 75 70 75 Q62 75 60 68 Q57 62 50 62 Q43 62 40 68 Q38 75 30 75 Q18 75 18 65 Z" />
  </svg>
);

export default function PrivacyModeToggle({ enabled, onToggle }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-2">
      <motion.div
        animate={enabled ? {} : {}}
        className="rounded-2xl border overflow-hidden transition-all duration-500"
        style={enabled ? {
          background: 'linear-gradient(135deg, #0d1117 0%, #0f2419 50%, #0d1117 100%)',
          borderColor: 'rgba(29,158,117,0.5)',
          boxShadow: '0 0 32px rgba(29,158,117,0.38), inset 0 0 30px rgba(29,158,117,0.08)',
        } : {
          background: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div className="p-4 flex items-center justify-between gap-3">
          {/* Left: icon + label */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
              style={enabled ? {
                background: 'linear-gradient(135deg, #1D9E75, #0d6e50)',
                boxShadow: '0 0 12px rgba(29,158,117,0.5)',
              } : { background: 'hsl(var(--muted))' }}
            >
              <IncognitoIcon color={enabled ? '#fff' : 'hsl(var(--muted-foreground))'} size={20} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-sm font-bold transition-colors duration-500"
                style={{ color: enabled ? '#ffffff' : 'hsl(var(--foreground))' }}
              >
                Privacy Mode
              </span>
              <button
                onClick={() => setShowHelp((v) => !v)}
                className="flex-shrink-0 transition-opacity"
                style={{ color: enabled ? 'rgba(255,255,255,0.5)' : 'hsl(var(--muted-foreground))' }}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: toggle */}
          <button
            onClick={onToggle}
            className="flex-shrink-0 relative w-12 h-6 rounded-full transition-all duration-400 focus:outline-none"
            style={enabled ? {
              background: 'linear-gradient(90deg, #1D9E75, #25d99e)',
              boxShadow: '0 0 14px rgba(29,158,117,0.7)',
            } : {
              background: 'hsl(var(--muted))',
              border: '1.5px solid hsl(var(--border))',
            }}
          >
            <motion.div
              className="absolute top-0.5 w-5 h-5 rounded-full shadow-md"
              animate={{ left: enabled ? '26px' : '2px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={enabled ? {
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255,255,255,0.6)',
              } : {
                background: '#ffffff',
                border: '1px solid hsl(var(--border))',
              }}
            />
          </button>
        </div>

        {/* Help text */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-4 text-xs leading-relaxed"
                style={{ color: enabled ? 'rgba(255,255,255,0.6)' : 'hsl(var(--muted-foreground))' }}
              >
                When Privacy Mode is on, your circle members won't see the names of your calendar events — they'll only see "<span className="font-semibold">You are busy</span>" with the time. Perfect for keeping personal plans private while still letting friends know you're not available.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
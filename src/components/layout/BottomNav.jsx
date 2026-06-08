import { Home, CalendarDays, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { icon: Home, label: 'Home' },
  { icon: Megaphone, label: 'Events' },
  { icon: CalendarDays, label: 'Calendar' },
];

export default function BottomNav({ tabIndex, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {tabs.map(({ icon: Icon, label }, i) => {
          const isActive = tabIndex === i;
          return (
            <button
              key={label}
              onClick={() => onTabChange(i)}
              className="relative flex flex-col items-center gap-0.5 px-6 py-1.5"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-1 w-8 h-1 rounded-full"
                  style={{ backgroundColor: '#1D9E75' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${isActive ? '' : 'text-muted-foreground'}`}
                style={isActive ? { color: '#1D9E75' } : {}}
              />
              <span
                className={`text-[10px] font-semibold transition-colors duration-200 ${isActive ? '' : 'text-muted-foreground'}`}
                style={isActive ? { color: '#1D9E75' } : {}}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
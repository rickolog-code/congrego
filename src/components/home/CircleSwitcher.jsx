import { useCircle } from '@/lib/useCircleContext.jsx';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export default function CircleSwitcher() {
  const { circles, activeCircleId, switchCircle } = useCircle();

  if (circles.length === 0) return null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 px-1 scrollbar-hide">
      {circles.map((circle) => {
        const isActive = circle.id === activeCircleId;
        return (
          <motion.button
            key={circle.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => switchCircle(circle.id)}
            className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-200 ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                : 'bg-card text-foreground border-border hover:border-primary/30'
            }`}
          >
            {circle.image_url ? (
              <img src={circle.image_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold whitespace-nowrap">{circle.name}</span>
            {isActive && (
              <motion.div
                layoutId="circleDot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
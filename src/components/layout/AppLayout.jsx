import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useCircle } from '@/lib/useCircleContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
};

export default function AppLayout() {
  const { circles, isLoadingCircles } = useCircle();
  const hasCircle = !isLoadingCircles && circles && circles.length > 0;
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className={`relative z-10 max-w-lg mx-auto min-h-screen ${hasCircle ? 'pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      {hasCircle && <BottomNav />}
    </div>
  );
}
import { useRef, useState, Children } from 'react';
import { motion } from 'framer-motion';

const SWIPE_THRESHOLD = 50; // px needed to trigger a tab change

export default function SwipeableTabs({ tabIndex, onTabChange, children }) {
  const count = Children.count(children);
  const childArray = Children.toArray(children);

  // Track touch start
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const locked = useRef(null); // 'horizontal' | 'vertical' | null

  const [dragX, setDragX] = useState(0);
  const [isActiveDrag, setIsActiveDrag] = useState(false);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    locked.current = null;
    isDragging.current = false;
    setDragX(0);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (!locked.current) {
      if (Math.abs(dx) > Math.abs(dy) + 5) {
        locked.current = 'horizontal';
      } else if (Math.abs(dy) > Math.abs(dx) + 5) {
        locked.current = 'vertical';
      }
    }

    if (locked.current !== 'horizontal') return;

    // Prevent swiping past first/last tab (add resistance)
    const atStart = tabIndex === 0 && dx > 0;
    const atEnd = tabIndex === count - 1 && dx < 0;
    const resistance = 0.3;
    const clamped = atStart || atEnd ? dx * resistance : dx;

    isDragging.current = true;
    setIsActiveDrag(true);
    setDragX(clamped);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) { setDragX(0); return; }
    isDragging.current = false;
    setIsActiveDrag(false);

    if (dragX < -SWIPE_THRESHOLD && tabIndex < count - 1) {
      onTabChange(tabIndex + 1);
    } else if (dragX > SWIPE_THRESHOLD && tabIndex > 0) {
      onTabChange(tabIndex - 1);
    }
    setDragX(0);
    touchStartX.current = null;
  };

  // Width of the container (use window width)
  const W = typeof window !== 'undefined' ? window.innerWidth : 375;

  return (
    <div
      className="overflow-hidden w-full relative"
      style={{ minHeight: '100%' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="flex w-full"
        animate={{ x: -(tabIndex * W) + dragX }}
        transition={isActiveDrag
          ? { type: 'tween', duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 35, mass: 0.8 }
        }
        style={{ width: `${count * 100}%` }}
      >
        {childArray.map((child, i) => (
          <div
            key={i}
            style={{ width: `${100 / count}%`, flexShrink: 0 }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useCircle } from '@/lib/useCircleContext.jsx';

export default function AppLayout() {
  const { circles, isLoadingCircles } = useCircle();
  const hasCircle = !isLoadingCircles && circles && circles.length > 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className={`relative z-10 max-w-lg mx-auto min-h-screen ${hasCircle ? 'pb-20' : ''}`}>
        <Outlet />
      </div>
      {hasCircle && <BottomNav />}
    </div>
  );
}
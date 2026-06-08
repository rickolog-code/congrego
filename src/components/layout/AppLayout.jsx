import { useLocation, useNavigate } from 'react-router-dom';
import { useCircle } from '@/lib/useCircleContext.jsx';
import SwipeableTabs from './SwipeableTabs';
import BottomNav from './BottomNav';
import Home from '@/pages/Home';
import Events from '@/pages/Events';
import CalendarPage from '@/pages/CalendarPage';

const TAB_PATHS = ['/', '/events', '/calendar'];

export default function AppLayout() {
  const { circles, isLoadingCircles } = useCircle();
  const hasCircle = !isLoadingCircles && circles && circles.length > 0;
  const location = useLocation();
  const navigate = useNavigate();

  const tabIndex = Math.max(0, TAB_PATHS.indexOf(location.pathname));

  const handleTabChange = (index) => {
    navigate(TAB_PATHS[index]);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className={`relative z-10 max-w-lg mx-auto min-h-screen ${hasCircle ? 'pb-20' : ''}`}>
        <SwipeableTabs tabIndex={tabIndex} onTabChange={handleTabChange}>
          <Home />
          <Events />
          <CalendarPage />
        </SwipeableTabs>
      </div>
      {hasCircle && <BottomNav onTabChange={handleTabChange} tabIndex={tabIndex} />}
    </div>
  );
}
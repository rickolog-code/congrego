import { useLocation, useNavigate } from 'react-router-dom';
import { useCircle } from '@/lib/useCircleContext.jsx';
import SwipeableTabs from './SwipeableTabs';
import BottomNav from './BottomNav';
import Home from '@/pages/Home';
import Events from '@/pages/Events';
import CalendarPage from '@/pages/CalendarPage';

const TAB_PATHS = ['/', '/events', '/calendar'];
const MONKEY_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/d6873467d_Monkey.png";
const TREE_IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/2eed85bff_Tree.png";

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
      {/* Decorative images — always mounted so they never flash on tab switch */}
      <div
        className="fixed top-0 right-0 z-10 pointer-events-none select-none"
        style={{ width: '90vw', maxWidth: 500 }}
      >
        <img src={MONKEY_IMG} alt="" className="w-full" />
      </div>
      <img
        src={TREE_IMG}
        alt=""
        className="pointer-events-none fixed left-0 z-0"
        style={{ width: '100vw', bottom: '19px' }}
      />

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
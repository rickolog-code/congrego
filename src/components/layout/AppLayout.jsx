import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { JungleBottom, MonkeyVine } from './JungleDecoration';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Monkey on vine - top right, shifted slightly right */}
      <MonkeyVine className="top-0 right-[-8px] z-0" />
      {/* Bottom jungle scene */}
      <JungleBottom />
      <div className="relative z-10 pb-20 max-w-lg mx-auto min-h-screen">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
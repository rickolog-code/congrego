import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="relative z-10 pb-20 max-w-lg mx-auto min-h-screen">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
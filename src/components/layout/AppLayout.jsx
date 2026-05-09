import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import LeafDecoration from './LeafDecoration';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background jungle-bg relative overflow-hidden">
      <LeafDecoration className="text-primary -top-10 -left-10 w-40 h-40 rotate-[-30deg]" />
      <LeafDecoration className="text-primary -bottom-16 -right-8 w-48 h-48 rotate-[150deg]" />
      <div className="relative z-10 pb-20 max-w-lg mx-auto min-h-screen">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
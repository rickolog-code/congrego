import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const IMG = "https://media.base44.com/images/public/69ff930a3528037ceadeeade/5d448a907_0c3309cd-a390-480d-87b5-66dccb9b8e20.png";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      {/* Monkey + vine — top right corner */}
      <div
        className="pointer-events-none absolute top-0 right-0 z-0"
        style={{ width: 220, height: 220, overflow: 'hidden' }}
      >
        <img
          src={IMG}
          alt=""
          style={{
            position: 'absolute',
            width: 560,
            top: -10,
            right: -10,
          }}
        />
      </div>

      {/* Tree — bottom left, sitting on nav */}
      <div
        className="pointer-events-none absolute bottom-12 left-0 z-0"
        style={{ width: 200, height: 230, overflow: 'hidden' }}
      >
        <img
          src={IMG}
          alt=""
          style={{
            position: 'absolute',
            width: 520,
            bottom: -10,
            left: -10,
          }}
        />
      </div>

      <div className="relative z-10 pb-20 max-w-lg mx-auto min-h-screen">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
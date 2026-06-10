import { useLocation, useNavigate } from 'react-router-dom';
import { useCircle } from '@/lib/useCircleContext.jsx';
import SwipeableTabs from './SwipeableTabs';
import BottomNav from './BottomNav';
import Home from '@/pages/Home';
import Events from '@/pages/Events';
import CalendarPage from '@/pages/CalendarPage';
import SetBusyButton from '@/components/calendar/SetBusyButton';
import { useState, useCallback } from 'react';

const TAB_PATHS = ['/', '/events', '/calendar'];
const CALENDAR_TAB = 2;

export default function AppLayout() {
  const { circles, isLoadingCircles } = useCircle();
  const hasCircle = !isLoadingCircles && circles && circles.length > 0;
  const location = useLocation();
  const navigate = useNavigate();

  const tabIndex = Math.max(0, TAB_PATHS.indexOf(location.pathname));

  // DatePick request state — lives here so FAB (fixed) can work with CalendarPage
  const [datePickRequest, setDatePickRequest] = useState(null);
  const requestDatePick = useCallback(({ singleMode, for: forWhom }) => {
    return new Promise((resolve) => {
      setDatePickRequest({ singleMode, for: forWhom, resolve });
    });
  }, []);
  const handleOverlayConfirm = useCallback((start, end) => {
    const resolve = datePickRequest?.resolve;
    setDatePickRequest(null);
    resolve?.({ start, end });
  }, [datePickRequest]);
  const handleOverlayCancel = useCallback(() => {
    const resolve = datePickRequest?.resolve;
    setDatePickRequest(null);
    resolve?.(null);
  }, [datePickRequest]);

  const handleTabChange = (index) => {
    navigate(TAB_PATHS[index]);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-1 overflow-hidden max-w-lg mx-auto w-full">
        <SwipeableTabs tabIndex={tabIndex} onTabChange={handleTabChange}>
          <Home />
          <Events />
          <CalendarPage
            datePickRequest={datePickRequest}
            onOverlayConfirm={handleOverlayConfirm}
            onOverlayCancel={handleOverlayCancel}
          />
        </SwipeableTabs>
      </div>

      {/* FAB: only visible on Calendar tab */}
      {hasCircle && tabIndex === CALENDAR_TAB && (
        <SetBusyButton
          key={tabIndex} // remounts (resets position) each time calendar tab is visited
          onRequestDatePick={requestDatePick}
        />
      )}

      {hasCircle && <BottomNav onTabChange={handleTabChange} tabIndex={tabIndex} />}
    </div>
  );
}
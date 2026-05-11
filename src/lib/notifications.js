// ============================================================
// Congrego — Notification & Service Worker Helpers
// ============================================================
// USAGE GUIDE:
//
// 1. Register service worker on app startup:
//    import { registerServiceWorker } from '@/lib/notifications';
//    registerServiceWorker();
//
// 2. Request permission + subscribe:
//    import { requestNotificationPermission } from '@/lib/notifications';
//    const granted = await requestNotificationPermission();
//
// 3. Send a local notification:
//    import { sendLocalNotification } from '@/lib/notifications';
//    sendLocalNotification('availabilityReminder');
//    sendLocalNotification('newEvent', { authorName: 'Alex', eventTitle: 'Movie Night' });
//    sendLocalNotification('calendarEvent', { authorName: 'Sam', eventTitle: 'Hiking Trip' });
//
// 4. Check if notifications are enabled:
//    import { notificationsEnabled } from '@/lib/notifications';
//    const enabled = notificationsEnabled(); // returns boolean
//
// 5. Schedule the 6PM daily reminder (call this once on app load):
//    import { scheduleDailyReminder } from '@/lib/notifications';
//    scheduleDailyReminder();
//
// ── HOW TO EDIT NOTIFICATION TEXT ──
// Open public/sw.js and find the relevant section (search for
// 'availabilityReminder', 'newEvent', or 'calendarEvent').
// Edit the title and options.body strings.
// ============================================================

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.register('/sw.js');
  }
}

export function notificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendLocalNotification(type, data = {}) {
  if (!notificationsEnabled()) return;

  navigator.serviceWorker.ready.then((reg) => {
    let title = 'Congrego';
    let options = { icon: '/favicon.ico', badge: '/favicon.ico', vibrate: [200, 100, 200] };

    if (type === 'availabilityReminder') {
      title = "Don't forget to check in! 🌿";
      options.body = "Let your circle know if you're free tonight.";
      options.tag = 'availability-reminder';
    } else if (type === 'newEvent') {
      title = `${data.authorName || 'Someone'} just posted an event! 📅`;
      options.body = data.eventTitle || 'Check it out in your circle.';
      options.tag = 'new-event';
    } else if (type === 'calendarEvent') {
      title = `${data.authorName || 'Someone'} just suggested some plans 🗓️`;
      options.body = data.eventTitle || 'View it on your calendar.';
      options.tag = 'calendar-event';
    }

    reg.showNotification(title, options);
  });
}

// Schedules a daily check: if it's 6PM and user hasn't set availability, send reminder.
// Call this once on app load. Pass user's today availability status.
export function scheduleDailyReminder(getAvailabilityStatus) {
  const checkAndNotify = () => {
    const now = new Date();
    if (now.getHours() === 18 && now.getMinutes() === 0) {
      const status = getAvailabilityStatus?.();
      if (!status || status === 'unset') {
        sendLocalNotification('availabilityReminder');
      }
    }
  };

  // Check every minute
  const interval = setInterval(checkAndNotify, 60 * 1000);
  return () => clearInterval(interval);
}
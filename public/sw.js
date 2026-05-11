// ============================================================
// Congrego Service Worker — Push Notifications
// ============================================================
// To edit notification text, find the relevant event below.
//
// DAILY 6PM AVAILABILITY REMINDER
//   Search for: 'availabilityReminder'
//   Edit the title/body inside that section.
//
// NEW EVENT POSTED
//   Search for: 'newEvent'
//   Edit the title/body inside that section.
//
// NEW CALENDAR EVENT
//   Search for: 'calendarEvent'
//   Edit the title/body inside that section.
// ============================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push events from server
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const type = data.type || 'generic';

  let title = 'Congrego';
  let options = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
  };

  if (type === 'availabilityReminder') {
    // ── EDIT THIS SECTION to change the 6PM availability reminder ──
    title = "Don't forget to check in! 🌿";
    options.body = "Let your circle know if you're free tonight.";
    options.tag = 'availability-reminder';
    // ────────────────────────────────────────────────────────────────
  } else if (type === 'newEvent') {
    // ── EDIT THIS SECTION to change the new event post notification ──
    title = `${data.authorName || 'Someone'} just posted an event! 📅`;
    options.body = data.eventTitle || 'Check it out in your circle.';
    options.tag = 'new-event';
    // ─────────────────────────────────────────────────────────────────
  } else if (type === 'calendarEvent') {
    // ── EDIT THIS SECTION to change the calendar suggestion notification ──
    title = `${data.authorName || 'Someone'} just suggested some plans 🗓️`;
    options.body = data.eventTitle || 'View it on your calendar.';
    options.tag = 'calendar-event';
    // ─────────────────────────────────────────────────────────────────────
  } else {
    title = data.title || 'Congrego';
    options.body = data.body || '';
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — opens the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// ============================================================
// SCHEDULED DAILY 6PM REMINDER
// ============================================================
// This service worker cannot schedule itself — you need to
// trigger it from your backend or use the Web Alarms API.
//
// To trigger the 6PM reminder, send a push notification from
// your server at 6PM with the payload:
//   { "type": "availabilityReminder" }
//
// Or, to implement it client-side, register a setInterval
// check in your app that calls:
//   registration.showNotification(title, options)
// when the current hour is 18 and the user hasn't checked in.
// ============================================================

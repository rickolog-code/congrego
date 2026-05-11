# Congrego — Widget & Notification Guide

## How to Edit Notification Text
Open `public/sw.js` and `lib/notifications.js`.
Each notification type has a clearly labeled section with comments:
- `availabilityReminder` — the 6PM check-in reminder
- `newEvent` — when someone posts an event
- `calendarEvent` — when someone suggests plans on the calendar

Edit the `title` and `options.body` strings in those sections.

---

## Widget (iOS / Android Home Screen Widget)

### What the widget does:
- Shows two checkboxes: **Free** and **Busy**
- If user taps Free → sets availability to `free` in the app
- If user taps Busy → sets availability to `busy`
- If user taps BOTH → sets availability to `maybe` (no reason, since the user hasn't entered one in-app)

### How to build it:

**iOS (WidgetKit — Swift):**
1. Add a Widget Extension target in Xcode.
2. In your widget view, render two Toggle/Button elements labeled "Free" and "Busy".
3. On tap, use a deep link URL scheme like `congrego://availability?status=free` to open the app and set availability.
4. In the React app, add a URL scheme handler in `index.html` or a native bridge to call the API.
5. Widget style: green background (`#2D6A4F`), white text, rounded corners, minimal.

**Android (Glance — Kotlin):**
1. Create an AppWidget using Jetpack Glance.
2. Render two checkboxes / buttons.
3. On action, broadcast an Intent with `status=free` or `status=busy`.
4. Handle it in a BroadcastReceiver that calls your API.

### Editing widget text:
- iOS: Edit the `Text("Free")` / `Text("Busy")` strings in your Swift WidgetView file.
- Android: Edit the string resources or hardcoded labels in your Glance composable.

### Red dot logic:
The red dot disappears from the 3-dot menu when:
1. Notifications are enabled (`Notification.permission === 'granted'`)
2. Calendar is synced (`myMembership.calendar_synced === true`)
3. Widget is enabled (store a flag in localStorage: `localStorage.setItem('widgetEnabled', 'true')`)

---

## To insert the service worker:
1. Copy `public/sw.js` into your project's `public/` folder.
2. In `main.jsx`, add:
   ```js
   import { registerServiceWorker } from '@/lib/notifications';
   registerServiceWorker();
   ```
3. Done — the browser will register the SW automatically on load.

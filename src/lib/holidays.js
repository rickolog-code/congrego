// Returns holidays for a given year as { 'yyyy-MM-dd': { name, emoji } }
export function getHolidays(year) {
  const h = {};

  const add = (month, day, name, emoji) => {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    h[key] = { name, emoji };
  };

  // Helper: nth weekday of a month (weekday: 0=Sun…6=Sat, nth: 1-based, or -1 = last)
  const nthWeekday = (month, weekday, nth) => {
    if (nth === -1) {
      // last occurrence
      let day = new Date(year, month, 0).getDate(); // last day of month
      while (new Date(year, month - 1, day).getDay() !== weekday) day--;
      return day;
    }
    let day = 1;
    while (new Date(year, month - 1, day).getDay() !== weekday) day++;
    return day + (nth - 1) * 7;
  };

  // Easter (Anonymous Gregorian algorithm)
  const easter = (() => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const hh = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - hh - k) % 7;
    const m = Math.floor((a + 11 * hh + 22 * l) / 451);
    const month = Math.floor((hh + l - 7 * m + 114) / 31);
    const day = ((hh + l - 7 * m + 114) % 31) + 1;
    return { month, day };
  })();

  // Fixed-date holidays
  add(1, 1, "New Year's Day", '🎆');
  add(2, 14, "Valentine's Day", '💝');
  add(3, 17, "St. Patrick's Day", '🍀');
  add(4, 1, "April Fools' Day", '🃏');
  add(6, 19, 'Juneteenth', '✊');
  add(7, 4, 'Independence Day', '🇺🇸');
  add(10, 31, 'Halloween', '🎃');
  add(11, 11, "Veterans Day", '🎖️');
  add(12, 24, 'Christmas Eve', '🌟');
  add(12, 25, 'Christmas Day', '🎄');
  add(12, 26, 'Kwanzaa Begins', '🕯️');
  add(12, 31, "New Year's Eve", '🥂');

  // Easter Sunday
  add(easter.month, easter.day, 'Easter', '🐣');

  // Floating holidays
  add(1, nthWeekday(1, 1, 3), "Martin Luther King Jr. Day", '✊');
  add(2, nthWeekday(2, 1, 3), "Presidents' Day", '🏛️');
  add(5, nthWeekday(5, 0, 2), "Mother's Day", '💐');
  add(6, nthWeekday(6, 0, 3), "Father's Day", '👔');
  add(9, nthWeekday(9, 1, 1), 'Labor Day', '⚒️');
  add(10, nthWeekday(10, 1, 2), 'Columbus Day', '⚓');
  add(11, nthWeekday(11, 4, 4), 'Thanksgiving', '🦃');

  // Memorial Day = last Monday of May
  add(5, nthWeekday(5, 1, -1), 'Memorial Day', '🎗️');

  return h;
}
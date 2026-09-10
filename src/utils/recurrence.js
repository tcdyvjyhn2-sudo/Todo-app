export const INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
export const MINUTES_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
export const DEFAULT_TIME_OF_DAY = '12:00'; // noon, 24-hour storage format

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function intervalLabel(interval) {
  return INTERVALS.find((i) => i.value === interval)?.label ?? interval;
}

// A distinct color per recurrence so daily/weekly/monthly/yearly tasks are
// tellable apart at a glance, not just by reading the badge text.
const INTERVAL_DOT_COLORS = {
  daily: '#3b82f6',
  weekly: '#8b5cf6',
  monthly: '#14b8a6',
  yearly: '#eab308',
};

export function intervalColor(interval) {
  return INTERVAL_DOT_COLORS[interval] ?? '#8b8b9e';
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInMonth(year, monthIndex) {
  // Passing monthIndex+1 with day 0 rolls back to the last day of monthIndex.
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Moves a date forward by one cycle of `interval`. For weekly/monthly, `meta`
// pins the cycle to a specific weekday or day-of-month rather than drifting
// with whatever day the task happened to start on:
// - weekly: adding 7 days always lands back on the same weekday on its own,
//   so no extra alignment is needed here once the starting date is right.
// - monthly: naively adding a month (via setMonth) overflows for a day that
//   doesn't exist in the next month (Jan 31 -> "Mar 3"). This clamps to the
//   target day-of-month, or the last day of the month if it's shorter.
function advanceOnce(date, interval, meta = {}) {
  const d = new Date(date);
  switch (interval) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return d;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return d;
    case 'monthly': {
      const dayOfMonth = meta.dayOfMonth ?? d.getDate();
      const year = d.getFullYear();
      const nextMonthIndex = d.getMonth() + 1;
      const clampedDay = Math.min(dayOfMonth, daysInMonth(year, nextMonthIndex));
      return new Date(year, nextMonthIndex, clampedDay);
    }
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      return d;
    default:
      return d;
  }
}

// The next date on/after `date` that falls on the given weekday (0=Sunday).
function alignToWeekday(date, dayOfWeek) {
  const d = startOfDay(new Date(date));
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// The next date on/after `date` that falls on the given day-of-month,
// clamped for short months (choosing 31 in a 30-day month means the 30th).
function alignToDayOfMonth(date, dayOfMonth) {
  const d = startOfDay(new Date(date));
  const year = d.getFullYear();
  const monthIndex = d.getMonth();
  let candidate = new Date(year, monthIndex, Math.min(dayOfMonth, daysInMonth(year, monthIndex)));
  if (candidate < d) {
    const nextMonthIndex = monthIndex + 1;
    candidate = new Date(year, nextMonthIndex, Math.min(dayOfMonth, daysInMonth(year, nextMonthIndex)));
  }
  return candidate;
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Given the task's current due date (may be null or overdue) and its
// recurrence interval, return the ISO date of the next occurrence strictly
// after today. `meta.dayOfWeek`/`meta.dayOfMonth` keep weekly/monthly tasks
// pinned to the chosen day rather than drifting.
export function getNextOccurrence(currentDueDateISO, interval, meta = {}) {
  const today = startOfDay(new Date());
  const base = currentDueDateISO ? startOfDay(new Date(`${currentDueDateISO}T00:00:00`)) : today;

  let next = advanceOnce(base, interval, meta);
  let guard = 0;
  while (next <= today && guard < 1000) {
    next = advanceOnce(next, interval, meta);
    guard += 1;
  }
  return toISODate(next);
}

// The due date a brand-new (or just-reconfigured) recurring task should
// start on - the next occurrence of its chosen weekday/day-of-month,
// counting today if today already matches.
export function initialOccurrence(interval, meta = {}) {
  const today = startOfDay(new Date());
  if (interval === 'weekly' && typeof meta.dayOfWeek === 'number') {
    return toISODate(alignToWeekday(today, meta.dayOfWeek));
  }
  if (interval === 'monthly' && typeof meta.dayOfMonth === 'number') {
    return toISODate(alignToDayOfMonth(today, meta.dayOfMonth));
  }
  return toISODate(today);
}

// "HH:MM" (24-hour storage format) -> {hour12, minute, period}, for
// populating the hour/minute/AM-PM selects from a stored time.
export function to12Hour(timeOfDay) {
  const [hourStr, minute] = (timeOfDay || DEFAULT_TIME_OF_DAY).split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour12, minute, period };
}

// {hour12, minute, period} -> "HH:MM" (24-hour storage format).
export function from12Hour(hour12, minute, period) {
  let hour = Number(hour12) % 12;
  if (period === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

// "HH:MM" (24-hour storage format) -> "8:00 AM".
export function formatTimeOfDay(timeOfDay) {
  if (!timeOfDay) return '';
  const { hour12, minute, period } = to12Hour(timeOfDay);
  return `${hour12}:${minute} ${period}`;
}

// "15 Sep 2026", or "Tomorrow" when the date is exactly one day from today -
// either way with an optional time appended for tasks that have one
// ("Tomorrow, 12:00 PM"). The weekday name is left out: for weekly tasks
// it's redundant with the day-of-week selector shown right next to it, and
// dropping it keeps every other due date the same length.
export function formatDueDate(dueDateISO, timeOfDay) {
  if (!dueDateISO) return '';
  const date = new Date(`${dueDateISO}T00:00:00`);
  const today = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(date) - today) / 86400000);

  const day = date.getDate();
  const month = MONTH_ABBR[date.getMonth()];
  const year = date.getFullYear();
  const base = diffDays === 1 ? 'Tomorrow' : `${day} ${month} ${year}`;
  return timeOfDay ? `${base}, ${formatTimeOfDay(timeOfDay)}` : base;
}

export function isOverdue(dueDateISO) {
  if (!dueDateISO) return false;
  const today = startOfDay(new Date());
  const date = startOfDay(new Date(`${dueDateISO}T00:00:00`));
  return date < today;
}

// True once a recurring task's due date has arrived (today or earlier) -
// the point at which a completed recurring task should come back off the
// completed list. Date-only: there is no time-of-day trigger - a "time of
// day" on a daily task is informational (shown on the badge), since a
// static page with no server can't fire anything at an exact clock time.
export function isDueOrPast(dueDateISO) {
  if (!dueDateISO) return true;
  const today = startOfDay(new Date());
  const date = startOfDay(new Date(`${dueDateISO}T00:00:00`));
  return date <= today;
}

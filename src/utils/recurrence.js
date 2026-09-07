export const INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function intervalLabel(interval) {
  return INTERVALS.find((i) => i.value === interval)?.label ?? interval;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addInterval(date, interval) {
  const d = new Date(date);
  switch (interval) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      break;
  }
  return d;
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Given the task's current due date (may be null or overdue) and its recurrence
// interval, return the ISO date of the next occurrence strictly after today.
export function getNextOccurrence(currentDueDateISO, interval) {
  const today = startOfDay(new Date());
  const base = currentDueDateISO ? startOfDay(new Date(`${currentDueDateISO}T00:00:00`)) : today;

  let next = addInterval(base, interval);
  let guard = 0;
  while (next <= today && guard < 1000) {
    next = addInterval(next, interval);
    guard += 1;
  }
  return toISODate(next);
}

export function formatDueDate(dueDateISO) {
  if (!dueDateISO) return '';
  const date = new Date(`${dueDateISO}T00:00:00`);
  const today = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(date) - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isOverdue(dueDateISO) {
  if (!dueDateISO) return false;
  const today = startOfDay(new Date());
  const date = startOfDay(new Date(`${dueDateISO}T00:00:00`));
  return date < today;
}

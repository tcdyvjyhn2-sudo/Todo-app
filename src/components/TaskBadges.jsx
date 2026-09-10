import {
  INTERVALS,
  WEEKDAY_NAMES,
  DAYS_OF_MONTH,
  MONTH_NAMES,
  DEFAULT_TIME_OF_DAY,
  formatDueDate,
  isOverdue,
  initialOccurrence,
  intervalIcon,
} from '../utils/recurrence';
import { categoryColorHex } from '../utils/categoryColors';
import EditableNote from './EditableNote';
import TimeOfDayBadge from './TimeOfDayBadge';

const NO_CATEGORY = '';
const NOT_RECURRING = 'none';

export default function TaskBadges({ task, categories, onUpdateTask }) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  const category = categories?.find((c) => c.id === task.categoryId);
  const categoryTint = category
    ? `color-mix(in srgb, ${categoryColorHex(category.color)} 28%, var(--surface))`
    : 'var(--border)';

  function handleCategoryChange(e) {
    const value = e.target.value;
    onUpdateTask(task.id, { categoryId: value || null });
  }

  function handleIntervalChange(e) {
    const value = e.target.value;
    if (value === NOT_RECURRING) {
      onUpdateTask(task.id, {
        recurring: false,
        interval: null,
        dayOfWeek: null,
        dayOfMonth: null,
        monthOfYear: null,
        timeOfDay: null,
      });
      return;
    }
    // Anchor the new recurrence to whatever date the task already had (its
    // manual due date, if it had one) rather than always defaulting to
    // today - so switching a task due "25 Dec 2026" to Annual lands on
    // December 25, not on whatever day it happened to be edited.
    const anchor = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : new Date();
    const dayOfWeek = value === 'weekly' ? (task.dayOfWeek ?? anchor.getDay()) : null;
    const dayOfMonth =
      value === 'monthly' || value === 'yearly' ? (task.dayOfMonth ?? anchor.getDate()) : null;
    const monthOfYear = value === 'yearly' ? (task.monthOfYear ?? anchor.getMonth()) : null;
    onUpdateTask(task.id, {
      recurring: true,
      interval: value,
      dayOfWeek,
      dayOfMonth,
      monthOfYear,
      timeOfDay: task.timeOfDay ?? DEFAULT_TIME_OF_DAY,
      dueDate: initialOccurrence(value, { dayOfWeek, dayOfMonth, monthOfYear }),
    });
  }

  function handleDayOfWeekChange(e) {
    const dayOfWeek = Number(e.target.value);
    onUpdateTask(task.id, { dayOfWeek, dueDate: initialOccurrence('weekly', { dayOfWeek }) });
  }

  function handleDayOfMonthChange(e) {
    const dayOfMonth = Number(e.target.value);
    if (task.interval === 'yearly') {
      onUpdateTask(task.id, {
        dayOfMonth,
        dueDate: initialOccurrence('yearly', { monthOfYear: task.monthOfYear, dayOfMonth }),
      });
      return;
    }
    onUpdateTask(task.id, { dayOfMonth, dueDate: initialOccurrence('monthly', { dayOfMonth }) });
  }

  function handleMonthOfYearChange(e) {
    const monthOfYear = Number(e.target.value);
    onUpdateTask(task.id, {
      monthOfYear,
      dueDate: initialOccurrence('yearly', { monthOfYear, dayOfMonth: task.dayOfMonth }),
    });
  }

  return (
    <>
      <span className="task-meta">
        <select
          className="badge badge-select"
          style={{ background: categoryTint }}
          value={task.categoryId ?? NO_CATEGORY}
          onChange={handleCategoryChange}
          aria-label={`Category for "${task.title}"`}
        >
          <option value={NO_CATEGORY}>No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="badge badge-select"
          style={{ background: categoryTint }}
          value={task.recurring ? task.interval : NOT_RECURRING}
          onChange={handleIntervalChange}
          aria-label={`Recurrence for "${task.title}"`}
        >
          <option value={NOT_RECURRING}>One-time</option>
          {INTERVALS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {intervalIcon(opt.value)} {opt.label}
            </option>
          ))}
        </select>

        {task.recurring && task.interval === 'weekly' && (
          <select
            className="badge badge-select"
            style={{ background: categoryTint }}
            value={task.dayOfWeek ?? 0}
            onChange={handleDayOfWeekChange}
            aria-label={`Day of the week for "${task.title}"`}
          >
            {WEEKDAY_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        )}
        {task.recurring && task.interval === 'monthly' && (
          <select
            className="badge badge-select"
            style={{ background: categoryTint }}
            value={task.dayOfMonth ?? 1}
            onChange={handleDayOfMonthChange}
            aria-label={`Day of the month for "${task.title}"`}
          >
            {DAYS_OF_MONTH.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        {task.recurring && task.interval === 'yearly' && (
          <>
            <select
              className="badge badge-select"
              style={{ background: categoryTint }}
              value={task.monthOfYear ?? 0}
              onChange={handleMonthOfYearChange}
              aria-label={`Month for "${task.title}"`}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="badge badge-select"
              style={{ background: categoryTint }}
              value={task.dayOfMonth ?? 1}
              onChange={handleDayOfMonthChange}
              aria-label={`Day of the month for "${task.title}"`}
            >
              {DAYS_OF_MONTH.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </>
        )}

        {task.recurring && (
          <TimeOfDayBadge task={task} onUpdateTask={onUpdateTask} style={{ background: categoryTint }} />
        )}

        {task.dueDate && (
          <span className={`badge badge-due${overdue ? ' badge-overdue' : ''}`}>
            {formatDueDate(task.dueDate, task.timeOfDay)}
          </span>
        )}
      </span>

      {task.note && <EditableNote task={task} onUpdateTask={onUpdateTask} />}
    </>
  );
}

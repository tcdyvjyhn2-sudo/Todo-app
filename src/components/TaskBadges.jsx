import {
  INTERVALS,
  WEEKDAY_NAMES,
  DAYS_OF_MONTH,
  DEFAULT_TIME_OF_DAY,
  intervalColor,
  formatDueDate,
  isOverdue,
  initialOccurrence,
} from '../utils/recurrence';
import { categoryColorHex } from '../utils/categoryColors';
import EditableNote from './EditableNote';
import TimeOfDaySelects from './TimeOfDaySelects';

const NO_CATEGORY = '';
const NOT_RECURRING = 'none';

export default function TaskBadges({ task, categories, onUpdateTask }) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  const category = categories?.find((c) => c.id === task.categoryId);
  const categoryTint = category
    ? `color-mix(in srgb, ${categoryColorHex(category.color)} 28%, var(--surface))`
    : 'var(--border)';
  const intervalTint = task.recurring
    ? `color-mix(in srgb, ${intervalColor(task.interval)} 28%, var(--surface))`
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
        timeOfDay: null,
      });
      return;
    }
    const today = new Date();
    const dayOfWeek = value === 'weekly' ? (task.dayOfWeek ?? today.getDay()) : null;
    const dayOfMonth = value === 'monthly' ? (task.dayOfMonth ?? today.getDate()) : null;
    onUpdateTask(task.id, {
      recurring: true,
      interval: value,
      dayOfWeek,
      dayOfMonth,
      timeOfDay: value === 'daily' ? (task.timeOfDay ?? DEFAULT_TIME_OF_DAY) : null,
      dueDate: initialOccurrence(value, { dayOfWeek, dayOfMonth }),
    });
  }

  function handleDayOfWeekChange(e) {
    const dayOfWeek = Number(e.target.value);
    onUpdateTask(task.id, { dayOfWeek, dueDate: initialOccurrence('weekly', { dayOfWeek }) });
  }

  function handleDayOfMonthChange(e) {
    const dayOfMonth = Number(e.target.value);
    onUpdateTask(task.id, { dayOfMonth, dueDate: initialOccurrence('monthly', { dayOfMonth }) });
  }

  function handleTimeOfDayChange(nextTimeOfDay) {
    onUpdateTask(task.id, { timeOfDay: nextTimeOfDay });
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
          style={{ background: intervalTint }}
          value={task.recurring ? task.interval : NOT_RECURRING}
          onChange={handleIntervalChange}
          aria-label={`Recurrence for "${task.title}"`}
        >
          <option value={NOT_RECURRING}>One-time</option>
          {INTERVALS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              ↻ {opt.label}
            </option>
          ))}
        </select>

        {task.recurring && task.interval === 'daily' && (
          <TimeOfDaySelects
            timeOfDay={task.timeOfDay}
            onChange={handleTimeOfDayChange}
            labelPrefix={`Time of day for "${task.title}"`}
            className="badge badge-select"
            style={{ background: intervalTint }}
          />
        )}
        {task.recurring && task.interval === 'weekly' && (
          <select
            className="badge badge-select"
            style={{ background: intervalTint }}
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
            style={{ background: intervalTint }}
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

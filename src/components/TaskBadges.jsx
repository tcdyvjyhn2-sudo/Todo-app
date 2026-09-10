import { INTERVALS, intervalColor, formatDueDate, isOverdue, getNextOccurrence } from '../utils/recurrence';
import { categoryColorHex } from '../utils/categoryColors';

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
      onUpdateTask(task.id, { recurring: false, interval: null });
      return;
    }
    onUpdateTask(task.id, {
      recurring: true,
      interval: value,
      dueDate: task.recurring ? task.dueDate : getNextOccurrence(task.dueDate, value),
    });
  }

  return (
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

      {task.dueDate && (
        <span className={`badge badge-due${overdue ? ' badge-overdue' : ''}`}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </span>
  );
}

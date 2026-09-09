import { intervalLabel, intervalColor, formatDueDate, isOverdue } from '../utils/recurrence';
import { categoryColorHex } from '../utils/categoryColors';

export default function TaskBadges({ task, categories }) {
  const overdue = !task.completed && isOverdue(task.dueDate);
  const category = categories?.find((c) => c.id === task.categoryId);

  return (
    <span className="task-meta">
      {category && (
        <span className="badge badge-category">
          <span
            className="badge-dot"
            style={{ background: categoryColorHex(category.color) }}
            aria-hidden="true"
          />
          {category.name}
        </span>
      )}
      {task.recurring && (
        <span className="badge badge-recurring">
          <span
            className="badge-dot"
            style={{ background: intervalColor(task.interval) }}
            aria-hidden="true"
          />
          ↻ {intervalLabel(task.interval)}
        </span>
      )}
      {task.dueDate && (
        <span className={`badge badge-due${overdue ? ' badge-overdue' : ''}`}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </span>
  );
}

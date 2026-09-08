import { intervalLabel, formatDueDate, isOverdue } from '../utils/recurrence';

export default function TaskBadges({ task }) {
  const overdue = !task.completed && isOverdue(task.dueDate);

  return (
    <span className="task-meta">
      {task.recurring && (
        <span className="badge badge-recurring">↻ {intervalLabel(task.interval)}</span>
      )}
      {task.dueDate && (
        <span className={`badge badge-due${overdue ? ' badge-overdue' : ''}`}>
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </span>
  );
}

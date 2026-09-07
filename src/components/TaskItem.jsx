import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { intervalLabel, formatDueDate, isOverdue } from '../utils/recurrence';

export default function TaskItem({ task, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const overdue = !task.completed && isOverdue(task.dueDate);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-item${task.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as ${task.completed ? 'not done' : 'done'}`}
      />

      <div className="task-body">
        <span className="task-title">{task.title}</span>
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
      </div>

      <button
        type="button"
        className="task-delete"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.title}"`}
        title="Delete task"
      >
        ×
      </button>

      <button
        type="button"
        className="task-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder "${task.title}"`}
        title="Drag to reorder"
      >
        ⠿
      </button>
    </li>
  );
}

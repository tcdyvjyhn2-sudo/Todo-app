import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskBadges from './TaskBadges';

export default function TaskItem({ task, categories, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task-item${isDragging ? ' is-dragging' : ''}`}
    >
      <input
        type="checkbox"
        checked={false}
        onChange={() => onToggle(task.id)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as done`}
      />

      <div className="task-body">
        <span className="task-title">{task.title}</span>
        <TaskBadges task={task} categories={categories} />
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

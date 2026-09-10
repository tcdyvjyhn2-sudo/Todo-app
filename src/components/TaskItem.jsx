import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskBadges from './TaskBadges';
import { categoryColorHex } from '../utils/categoryColors';

export default function TaskItem({ task, categories, dragDisabled, onToggle, onDelete, onUpdateTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  });

  const category = categories?.find((c) => c.id === task.categoryId);
  const hex = category ? categoryColorHex(category.color) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    ...(hex && {
      borderLeft: `4px solid ${hex}`,
      background: `color-mix(in srgb, ${hex} 6%, var(--surface))`,
    }),
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
        <TaskBadges task={task} categories={categories} onUpdateTask={onUpdateTask} />
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

      {dragDisabled ? (
        <span className="task-handle task-handle-spacer" aria-hidden="true" />
      ) : (
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
      )}
    </li>
  );
}

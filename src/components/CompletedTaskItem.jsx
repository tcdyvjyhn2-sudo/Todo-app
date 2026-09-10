import TaskBadges from './TaskBadges';
import EditableTaskTitle from './EditableTaskTitle';
import { categoryColorHex } from '../utils/categoryColors';

export default function CompletedTaskItem({ task, categories, onToggle, onDelete, onUpdateTask }) {
  const category = categories?.find((c) => c.id === task.categoryId);
  const hex = category ? categoryColorHex(category.color) : null;

  const style = hex
    ? {
        borderLeft: `4px solid ${hex}`,
        background: `color-mix(in srgb, ${hex} 6%, var(--surface))`,
      }
    : undefined;

  return (
    <li className="task-item is-completed" style={style}>
      <input
        type="checkbox"
        checked
        onChange={() => onToggle(task.id)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as not done`}
      />

      <div className="task-body">
        <EditableTaskTitle task={task} onUpdateTask={onUpdateTask} />
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

      <span className="task-handle task-handle-spacer" aria-hidden="true" />
    </li>
  );
}

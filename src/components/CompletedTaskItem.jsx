import TaskBadges from './TaskBadges';

export default function CompletedTaskItem({ task, categories, onToggle, onDelete }) {
  return (
    <li className="task-item is-completed">
      <input
        type="checkbox"
        checked
        onChange={() => onToggle(task.id)}
        className="task-checkbox"
        aria-label={`Mark "${task.title}" as not done`}
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

      <span className="task-handle task-handle-spacer" aria-hidden="true" />
    </li>
  );
}

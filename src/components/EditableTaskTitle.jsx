import { useState } from 'react';

export default function EditableTaskTitle({ task, onUpdateTask }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function startEditing() {
    setDraft(task.title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask(task.id, { title: trimmed });
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(task.title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        type="text"
        className="task-title-input"
        value={draft}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={`Edit title, currently "${task.title}"`}
      />
    );
  }

  return (
    <button
      type="button"
      className="task-title task-title-button"
      onClick={startEditing}
      title="Click to edit"
    >
      {task.title}
    </button>
  );
}

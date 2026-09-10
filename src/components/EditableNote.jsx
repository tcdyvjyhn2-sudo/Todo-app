import { useState } from 'react';

export default function EditableNote({ task, onUpdateTask }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.note ?? '');

  function startEditing() {
    setDraft(task.note ?? '');
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== (task.note ?? '')) {
      onUpdateTask(task.id, { note: trimmed || null });
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(task.note ?? '');
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <textarea
        className="task-note-input"
        value={draft}
        autoFocus
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label="Edit note"
      />
    );
  }

  return (
    <button type="button" className="task-note task-note-button" onClick={startEditing} title="Click to edit">
      {task.note}
    </button>
  );
}

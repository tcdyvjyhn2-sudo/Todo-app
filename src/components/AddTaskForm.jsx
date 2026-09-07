import { useState } from 'react';
import { INTERVALS } from '../utils/recurrence';

export default function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [interval, setInterval] = useState('weekly');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd({ title: trimmed, dueDate: dueDate || null, recurring, interval });

    setTitle('');
    setDueDate('');
    setRecurring(false);
    setInterval('weekly');
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <div className="add-task-row">
        <input
          type="text"
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="add-task-input"
          aria-label="Task title"
        />
        <button type="submit" className="add-task-submit">
          Add
        </button>
      </div>
      <div className="add-task-row add-task-options">
        <label className="field-label">
          Due
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="add-task-date"
            aria-label="Due date"
          />
        </label>
        <label className="add-task-recurring">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Recurring
        </label>
        {recurring && (
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="add-task-interval"
            aria-label="Recurrence interval"
          >
            {INTERVALS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </form>
  );
}

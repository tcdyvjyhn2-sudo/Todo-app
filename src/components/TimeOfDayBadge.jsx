import { useState } from 'react';
import { formatTimeOfDay } from '../utils/recurrence';
import TimeOfDaySelects from './TimeOfDaySelects';

// A single tap-to-edit badge on the task row, rather than three permanently
// visible dropdowns cluttering every recurring task's line. Tap it to reveal
// the hour/minute/AM-PM selects; "Done" collapses back to the plain badge.
export default function TimeOfDayBadge({ task, onUpdateTask, style }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        className="badge badge-select"
        style={style}
        onClick={() => setEditing(true)}
        aria-label={`Time of day for "${task.title}": ${formatTimeOfDay(task.timeOfDay)}. Click to change.`}
      >
        {formatTimeOfDay(task.timeOfDay)}
      </button>
    );
  }

  return (
    <span className="time-edit-group">
      <TimeOfDaySelects
        timeOfDay={task.timeOfDay}
        onChange={(next) => onUpdateTask(task.id, { timeOfDay: next })}
        labelPrefix={`Time of day for "${task.title}"`}
        className="badge badge-select"
        style={style}
      />
      <button type="button" className="sync-link-button time-edit-done" onClick={() => setEditing(false)}>
        Done
      </button>
    </span>
  );
}

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import TaskItem from './TaskItem';
import CompletedTaskItem from './CompletedTaskItem';

function categoryNameFor(task, categories) {
  return categories.find((c) => c.id === task.categoryId)?.name ?? null;
}

// Sorts by category name (uncategorized last), keeping each category's
// relative order stable rather than sub-sorting by title.
function sortByCategory(tasks, categories) {
  return tasks
    .map((task, index) => ({ task, index, name: categoryNameFor(task, categories) }))
    .sort((a, b) => {
      if (a.name === null && b.name === null) return a.index - b.index;
      if (a.name === null) return 1;
      if (b.name === null) return -1;
      const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map((entry) => entry.task);
}

// A single sortable key combining date and time (tasks with no time sort as
// if due at the start of that day), so "due date and time of day" sort
// together as one ordering. Tasks with no due date at all sort last.
function dueDateTimeKey(task) {
  if (!task.dueDate) return null;
  return `${task.dueDate}T${task.timeOfDay ?? '00:00'}`;
}

function sortByDueDate(tasks) {
  return tasks
    .map((task, index) => ({ task, index, key: dueDateTimeKey(task) }))
    .sort((a, b) => {
      if (a.key === null && b.key === null) return a.index - b.index;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.task);
}

export default function TaskList({ tasks, categories, onToggle, onDelete, onReorder, onUpdateTask }) {
  const [sortMode, setSortMode] = useState('manual'); // 'manual' | 'category' | 'dueDate'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  }

  if (tasks.length === 0) {
    return <p className="empty-state">No tasks yet. Add one above to get started.</p>;
  }

  // Active tasks keep the order you drag them into. "Sort by category" and
  // "Sort by due date" only change how the list is displayed - the stored
  // order is never touched, so switching back to manual instantly and
  // exactly restores it.
  const manualActive = tasks.filter((t) => !t.completed);
  let active = manualActive;
  if (sortMode === 'category') active = sortByCategory(manualActive, categories);
  if (sortMode === 'dueDate') active = sortByDueDate(manualActive);

  const completed = tasks
    .filter((t) => t.completed)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const dragDisabled = sortMode !== 'manual';

  function toggleSort(mode) {
    setSortMode((current) => (current === mode ? 'manual' : mode));
  }

  return (
    <>
      {manualActive.length > 1 && (
        <div className="list-toolbar">
          <button
            type="button"
            className={`sync-link-button${sortMode === 'category' ? ' is-active' : ''}`}
            onClick={() => toggleSort('category')}
          >
            {sortMode === 'category' ? '↩ Manual order' : 'Sort by category'}
          </button>
          <button
            type="button"
            className={`sync-link-button${sortMode === 'dueDate' ? ' is-active' : ''}`}
            onClick={() => toggleSort('dueDate')}
          >
            {sortMode === 'dueDate' ? '↩ Manual order' : 'Sort by due date'}
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={active.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="task-list">
            {active.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                dragDisabled={dragDisabled}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {active.length === 0 && completed.length > 0 && (
        <p className="empty-state">Everything's done.</p>
      )}

      {completed.length > 0 && (
        <>
          <p className="completed-label">Completed ({completed.length})</p>
          <ul className="task-list">
            {completed.map((task) => (
              <CompletedTaskItem
                key={task.id}
                task={task}
                categories={categories}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

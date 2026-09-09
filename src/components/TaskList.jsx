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

export default function TaskList({ tasks, categories, onToggle, onDelete, onReorder }) {
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

  // Active tasks keep the order you drag them into. Completed tasks are done
  // and don't need reordering, so that section sorts alphabetically instead.
  const active = tasks.filter((t) => !t.completed);
  const completed = tasks
    .filter((t) => t.completed)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={active.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="task-list">
            {active.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                categories={categories}
                onToggle={onToggle}
                onDelete={onDelete}
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
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

import { useTasks } from './hooks/useTasks';
import AddTaskForm from './components/AddTaskForm';
import TaskList from './components/TaskList';
import './App.css';

export default function App() {
  const { tasks, addTask, deleteTask, toggleComplete, reorderTasks } = useTasks();

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-eyebrow">⌁ Saved only on this device</span>
        <h1>Task List</h1>
        <p className="app-subtitle">
          {tasks.length === 0
            ? 'Nothing on your list yet.'
            : `${tasks.filter((t) => !t.completed).length} of ${tasks.length} remaining`}
        </p>
      </header>

      <AddTaskForm onAdd={addTask} />

      <TaskList
        tasks={tasks}
        onToggle={toggleComplete}
        onDelete={deleteTask}
        onReorder={reorderTasks}
      />
    </div>
  );
}

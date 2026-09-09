import { useTasks } from './hooks/useTasks';
import AddTaskForm from './components/AddTaskForm';
import TaskList from './components/TaskList';
import SyncPanel from './components/SyncPanel';
import './App.css';

export default function App() {
  const { tasks, categories, addTask, addCategory, deleteTask, toggleComplete, reorderTasks, sync } =
    useTasks();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Task List</h1>
        <p className="app-subtitle">
          {tasks.length === 0
            ? 'Nothing on your list yet.'
            : `${tasks.filter((t) => !t.completed).length} of ${tasks.length} remaining`}
        </p>
      </header>

      <SyncPanel sync={sync} />

      <AddTaskForm onAdd={addTask} categories={categories} onCreateCategory={addCategory} />

      <TaskList
        tasks={tasks}
        categories={categories}
        onToggle={toggleComplete}
        onDelete={deleteTask}
        onReorder={reorderTasks}
      />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getNextOccurrence } from '../utils/recurrence';

const STORAGE_KEY = 'todo-app.tasks.v1';

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadTasks);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // localStorage unavailable (e.g. private browsing quota) - fail silently,
      // the list still works for the current page session.
    }
  }, [tasks]);

  const addTask = useCallback(({ title, dueDate, recurring, interval }) => {
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        dueDate: dueDate || null,
        recurring,
        interval: recurring ? interval : null,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleComplete = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.recurring) {
          // Completing a recurring task logs the completion and rolls its
          // due date forward instead of leaving it permanently checked off.
          return {
            ...t,
            completed: false,
            dueDate: getNextOccurrence(t.dueDate, t.interval),
            lastCompletedAt: new Date().toISOString(),
          };
        }
        return { ...t, completed: !t.completed };
      })
    );
  }, []);

  const updateTask = useCallback((id, changes) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const reorderTasks = useCallback((activeId, overId) => {
    setTasks((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  return { tasks, addTask, deleteTask, toggleComplete, updateTask, reorderTasks };
}

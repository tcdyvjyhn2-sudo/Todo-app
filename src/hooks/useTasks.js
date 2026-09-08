import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getNextOccurrence, isDueOrPast, toISODate } from '../utils/recurrence';
import { beginAuthorize, completeAuthorizeIfRedirected } from '../lib/dropboxAuth';
import { downloadTasks, uploadTasks } from '../lib/dropboxStore';
import {
  disconnect as disconnectDropboxSession,
  getStoredAppKey,
  getValidAccessToken,
  isConnected as isDropboxConnected,
  saveTokensFromAuthResponse,
  setStoredAppKey,
} from '../lib/dropboxSession';

const STORAGE_KEY = 'todo-app.tasks.v1';
const POLL_INTERVAL_MS = 30000;

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Shown only the very first time the app opens with no saved data, so a new
// user sees what recurring vs. one-off tasks look like instead of a blank list.
function exampleTasks() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: 'Team standup (example)',
      dueDate: offsetDate(0),
      recurring: true,
      interval: 'daily',
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Water the plants (example)',
      dueDate: offsetDate(2),
      recurring: true,
      interval: 'weekly',
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Renew passport (example)',
      dueDate: offsetDate(30),
      recurring: false,
      interval: null,
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Reply to landlord (example)',
      dueDate: null,
      recurring: false,
      interval: null,
      completed: true,
      createdAt: now,
    },
  ];
}

function readLocalTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return exampleTasks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) - fail silently,
    // the list still works for the current page session.
  }
}

// Flips back to active any completed recurring task whose next occurrence
// has arrived. Returns the same array reference when nothing changed, so
// callers can skip writing back unnecessarily.
function reactivateDueTasks(tasks) {
  let changed = false;
  const next = tasks.map((t) => {
    if (t.completed && t.recurring && isDueOrPast(t.dueDate)) {
      changed = true;
      return { ...t, completed: false };
    }
    return t;
  });
  return changed ? next : tasks;
}

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  // 'local' | 'connecting' | 'synced' | 'offline' | 'error'
  const [syncStatus, setSyncStatus] = useState('local');
  const [syncError, setSyncError] = useState('');
  const [dropboxAppKey, setDropboxAppKey] = useState(getStoredAppKey());
  const [dropboxConnected, setDropboxConnected] = useState(isDropboxConnected());

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const pushTimer = useRef(null);

  const schedulePush = useCallback((nextTasks) => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) return;
        await uploadTasks(accessToken, nextTasks);
        setSyncStatus('synced');
        setSyncError('');
      } catch (err) {
        setSyncStatus('error');
        setSyncError(err.message || 'Could not save to Dropbox.');
      }
    }, 600);
  }, []);

  const applyAndMaybePersist = useCallback(
    (updater, { persist = true } = {}) => {
      setTasks((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (persist) {
          if (dropboxConnected) {
            schedulePush(next);
          } else {
            writeLocalTasks(next);
          }
        }
        return next;
      });
    },
    [dropboxConnected, schedulePush]
  );

  const pullFromDropbox = useCallback(async () => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;
      let remote = await downloadTasks(accessToken);
      if (remote === null) {
        // No file yet - this is the first time this Dropbox account has
        // been connected, so seed it the same way a brand-new local list
        // would be seeded.
        remote = tasksRef.current.length ? tasksRef.current : exampleTasks();
        await uploadTasks(accessToken, remote);
      }
      const reactivated = reactivateDueTasks(remote);
      if (reactivated !== remote) {
        await uploadTasks(accessToken, reactivated);
      }
      setTasks(reactivated);
      setSyncStatus('synced');
      setSyncError('');
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err.message || 'Could not reach Dropbox.');
    }
  }, []);

  // Initial load: finish an OAuth redirect if we just came back from one,
  // then load from Dropbox if connected, otherwise from localStorage.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const appKey = getStoredAppKey();
      if (appKey) {
        try {
          const payload = await completeAuthorizeIfRedirected(appKey);
          if (payload) {
            saveTokensFromAuthResponse(payload);
            if (!cancelled) setDropboxConnected(true);
          }
        } catch (err) {
          if (!cancelled) {
            setSyncStatus('error');
            setSyncError(err.message);
          }
        }
      }

      if (!cancelled && isDropboxConnected()) {
        setSyncStatus('connecting');
        await pullFromDropbox();
      } else if (!cancelled) {
        const local = reactivateDueTasks(readLocalTasks());
        writeLocalTasks(local);
        setTasks(local);
        setSyncStatus('local');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While connected to Dropbox: poll periodically and on refocus so both
  // devices pick up each other's changes without a manual refresh.
  useEffect(() => {
    if (!dropboxConnected) return undefined;

    const interval = setInterval(pullFromDropbox, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pullFromDropbox();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', pullFromDropbox);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', pullFromDropbox);
    };
  }, [dropboxConnected, pullFromDropbox]);

  // Also sweep for date-rollover reactivations locally, so a task left
  // open overnight updates without needing a reload.
  useEffect(() => {
    const interval = setInterval(() => {
      applyAndMaybePersist((prev) => reactivateDueTasks(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [applyAndMaybePersist]);

  const addTask = useCallback(
    ({ title, dueDate, recurring, interval }) => {
      applyAndMaybePersist((prev) => [
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
    },
    [applyAndMaybePersist]
  );

  const deleteTask = useCallback(
    (id) => {
      applyAndMaybePersist((prev) => prev.filter((t) => t.id !== id));
    },
    [applyAndMaybePersist]
  );

  const toggleComplete = useCallback(
    (id) => {
      applyAndMaybePersist((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (t.completed) {
            // Un-completing: recurring tasks just go back to active as-is;
            // one-off tasks simply become unchecked again.
            return { ...t, completed: false };
          }
          if (t.recurring) {
            return {
              ...t,
              completed: true,
              dueDate: getNextOccurrence(t.dueDate, t.interval),
              lastCompletedAt: new Date().toISOString(),
            };
          }
          return { ...t, completed: true, lastCompletedAt: new Date().toISOString() };
        })
      );
    },
    [applyAndMaybePersist]
  );

  const updateTask = useCallback(
    (id, changes) => {
      applyAndMaybePersist((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [applyAndMaybePersist]
  );

  const reorderTasks = useCallback(
    (activeId, overId) => {
      applyAndMaybePersist((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === activeId);
        const newIndex = prev.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [applyAndMaybePersist]
  );

  const saveDropboxAppKey = useCallback((appKey) => {
    setStoredAppKey(appKey);
    setDropboxAppKey(appKey);
  }, []);

  const connectDropbox = useCallback(() => {
    if (!dropboxAppKey) return;
    beginAuthorize(dropboxAppKey);
  }, [dropboxAppKey]);

  const disconnectDropbox = useCallback(() => {
    disconnectDropboxSession();
    setDropboxConnected(false);
    setSyncStatus('local');
    setSyncError('');
    const local = reactivateDueTasks(readLocalTasks());
    setTasks(local);
  }, []);

  return {
    tasks,
    addTask,
    deleteTask,
    toggleComplete,
    updateTask,
    reorderTasks,
    sync: {
      status: syncStatus,
      error: syncError,
      connected: dropboxConnected,
      appKey: dropboxAppKey,
      saveAppKey: saveDropboxAppKey,
      connect: connectDropbox,
      disconnect: disconnectDropbox,
      refresh: pullFromDropbox,
    },
  };
}

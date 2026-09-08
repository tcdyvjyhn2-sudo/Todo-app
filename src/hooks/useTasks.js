import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getNextOccurrence, isDueOrPast, toISODate } from '../utils/recurrence';
import { beginAuthorize } from '../lib/dropboxAuth';
import { downloadTasks, uploadTasks, DropboxAuthError } from '../lib/dropboxStore';
import {
  bootstrapAuth,
  disconnect as disconnectDropboxSession,
  getStoredAppKey,
  getValidAccessToken,
  isConnected as isDropboxConnected,
  setStoredAppKey,
} from '../lib/dropboxSession';

const STORAGE_KEY = 'todo-app.tasks.v1';
const PENDING_KEY = 'todo-app.pendingSync.v1';
const POLL_INTERVAL_MS = 30000;
const PUSH_DEBOUNCE_MS = 600;

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

// The local copy is always kept current, connected to Dropbox or not, so the
// app opens instantly and keeps working with no network.
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
    // Storage unavailable (private browsing quota). The list still works for
    // this page session.
  }
}

// True when this device holds edits that have not reached Dropbox yet. Kept
// in storage so it survives a reload made while offline.
function readPending() {
  return localStorage.getItem(PENDING_KEY) === 'true';
}

function writePending(pending) {
  try {
    if (pending) localStorage.setItem(PENDING_KEY, 'true');
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Same as above - non-fatal.
  }
}

// Flips back to active any completed recurring task whose next occurrence has
// arrived. Returns the same array reference when nothing changed.
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

function describeFailure(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (err instanceof DropboxAuthError) return 'auth';
  if (err instanceof TypeError) return 'offline'; // fetch() network failure
  return 'error';
}

export function useTasks() {
  const [tasks, setTasks] = useState(readLocalTasks);
  // 'local' | 'connecting' | 'synced' | 'offline' | 'error'
  const [syncStatus, setSyncStatus] = useState(() =>
    isDropboxConnected() ? 'connecting' : 'local'
  );
  const [syncError, setSyncError] = useState('');
  const [dropboxAppKey, setDropboxAppKey] = useState(getStoredAppKey);
  const [dropboxConnected, setDropboxConnected] = useState(isDropboxConnected);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const pushTimer = useRef(null);

  // Sends the current list to Dropbox. Leaves the pending flag set if it
  // fails, so a later attempt retries the same edits.
  const pushNow = useCallback(async (nextTasks) => {
    if (!isDropboxConnected()) return;
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;
      await uploadTasks(accessToken, nextTasks);
      writePending(false);
      setSyncStatus('synced');
      setSyncError('');
    } catch (err) {
      const kind = describeFailure(err);
      setSyncStatus(kind === 'auth' ? 'error' : kind);
      setSyncError(
        kind === 'offline'
          ? ''
          : err.message || 'Could not save to Dropbox.'
      );
    }
  }, []);

  const schedulePush = useCallback(
    (nextTasks) => {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => pushNow(nextTasks), PUSH_DEBOUNCE_MS);
    },
    [pushNow]
  );

  // Single write path: local storage always, Dropbox too when connected.
  const applyChange = useCallback(
    (updater) => {
      setTasks((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next === prev) return prev;
        writeLocalTasks(next);
        if (isDropboxConnected()) {
          writePending(true);
          schedulePush(next);
        }
        return next;
      });
    },
    [schedulePush]
  );

  // Reconciles with Dropbox. Unsynced local edits win over the remote copy;
  // otherwise the remote copy is adopted.
  const syncWithDropbox = useCallback(async () => {
    if (!isDropboxConnected()) return;

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;

      if (readPending()) {
        await uploadTasks(accessToken, tasksRef.current);
        writePending(false);
        setSyncStatus('synced');
        setSyncError('');
        return;
      }

      let remote = await downloadTasks(accessToken);
      if (remote === null) {
        // First connection for this Dropbox account: seed it from whatever
        // this device already has.
        remote = tasksRef.current;
        await uploadTasks(accessToken, remote);
      }

      const reactivated = reactivateDueTasks(remote);
      if (reactivated !== remote) {
        await uploadTasks(accessToken, reactivated);
      }

      setTasks(reactivated);
      writeLocalTasks(reactivated);
      setSyncStatus('synced');
      setSyncError('');
    } catch (err) {
      const kind = describeFailure(err);
      setSyncStatus(kind === 'auth' ? 'error' : kind);
      setSyncError(
        kind === 'offline'
          ? ''
          : kind === 'auth'
            ? 'Dropbox access was revoked. Connect again to resume syncing.'
            : err.message || 'Could not reach Dropbox.'
      );
    }
  }, []);

  // First load: the local copy is already on screen (useState initialiser), so
  // finish any OAuth redirect, then reconcile in the background.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = reactivateDueTasks(readLocalTasks());
      writeLocalTasks(local);
      if (!cancelled) setTasks(local);

      const { connected, justConnected, error } = await bootstrapAuth();

      if (justConnected) {
        // Edits made before connecting belong to this device, so keep them and
        // let the first sync push them up.
        writePending(true);
      }
      if (cancelled) return;

      setDropboxConnected(connected);
      if (error) {
        setSyncStatus('error');
        setSyncError(error);
        return;
      }

      if (connected) {
        setSyncStatus('connecting');
        await syncWithDropbox();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile on a timer, when the tab regains attention, and the moment the
  // browser reports connectivity is back.
  useEffect(() => {
    if (!dropboxConnected) return undefined;

    const interval = setInterval(syncWithDropbox, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncWithDropbox();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', syncWithDropbox);
    window.addEventListener('online', syncWithDropbox);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', syncWithDropbox);
      window.removeEventListener('online', syncWithDropbox);
    };
  }, [dropboxConnected, syncWithDropbox]);

  // Bring recurring tasks back when their date arrives, without a reload.
  useEffect(() => {
    const interval = setInterval(() => {
      applyChange((prev) => reactivateDueTasks(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [applyChange]);

  const addTask = useCallback(
    ({ title, dueDate, recurring, interval }) => {
      applyChange((prev) => [
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
    [applyChange]
  );

  const deleteTask = useCallback(
    (id) => {
      applyChange((prev) => prev.filter((t) => t.id !== id));
    },
    [applyChange]
  );

  const toggleComplete = useCallback(
    (id) => {
      applyChange((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (t.completed) return { ...t, completed: false };
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
    [applyChange]
  );

  const updateTask = useCallback(
    (id, changes) => {
      applyChange((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [applyChange]
  );

  const reorderTasks = useCallback(
    (activeId, overId) => {
      applyChange((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === activeId);
        const newIndex = prev.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [applyChange]
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
    writePending(false);
    setDropboxConnected(false);
    setSyncStatus('local');
    setSyncError('');
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
      refresh: syncWithDropbox,
    },
  };
}

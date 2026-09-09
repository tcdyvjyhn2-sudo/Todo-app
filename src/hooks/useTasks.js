import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getNextOccurrence, isDueOrPast, toISODate } from '../utils/recurrence';
import { beginAuthorize } from '../lib/dropboxAuth';
import { downloadState, uploadState, DropboxAuthError } from '../lib/dropboxStore';
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

function exampleCategories() {
  return [{ id: crypto.randomUUID(), name: 'Work', color: 'blue' }];
}

// Shown only the very first time the app opens with no saved data, so a new
// user sees what recurring, categorized, and one-off tasks look like instead
// of a blank list.
function exampleTasks(categories) {
  const now = new Date().toISOString();
  const workId = categories[0]?.id ?? null;
  return [
    {
      id: crypto.randomUUID(),
      title: 'Team standup (example)',
      dueDate: offsetDate(0),
      recurring: true,
      interval: 'daily',
      categoryId: workId,
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Water the plants (example)',
      dueDate: offsetDate(2),
      recurring: true,
      interval: 'weekly',
      categoryId: null,
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Renew passport (example)',
      dueDate: offsetDate(30),
      recurring: false,
      interval: null,
      categoryId: null,
      completed: false,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Reply to landlord (example)',
      dueDate: null,
      recurring: false,
      interval: null,
      categoryId: null,
      completed: true,
      createdAt: now,
    },
  ];
}

// Accepts whatever shape was stored - a bare array (the format used before
// categories existed) or the current {tasks, categories} object - and always
// returns the current shape. Returns null for anything unrecognisable.
function normalizeState(parsed) {
  if (Array.isArray(parsed)) return { tasks: parsed, categories: [] };
  if (parsed && Array.isArray(parsed.tasks)) {
    return {
      tasks: parsed.tasks,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  }
  return null;
}

// The local copy is always kept current, connected to Dropbox or not, so the
// app opens instantly and keeps working with no network.
function readLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const categories = exampleCategories();
      return { tasks: exampleTasks(categories), categories };
    }
    return normalizeState(JSON.parse(raw)) ?? { tasks: [], categories: [] };
  } catch {
    return { tasks: [], categories: [] };
  }
}

function writeLocalState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
// arrived. Returns the same state reference when nothing changed.
function reactivateDueTasks(state) {
  let changed = false;
  const tasks = state.tasks.map((t) => {
    if (t.completed && t.recurring && isDueOrPast(t.dueDate)) {
      changed = true;
      return { ...t, completed: false };
    }
    return t;
  });
  return changed ? { ...state, tasks } : state;
}

function describeFailure(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (err instanceof DropboxAuthError) return 'auth';
  if (err instanceof TypeError) return 'offline'; // fetch() network failure
  return 'error';
}

export function useTasks() {
  const [state, setState] = useState(readLocalState);
  // 'local' | 'connecting' | 'synced' | 'offline' | 'error'
  const [syncStatus, setSyncStatus] = useState(() =>
    isDropboxConnected() ? 'connecting' : 'local'
  );
  const [syncError, setSyncError] = useState('');
  const [dropboxAppKey, setDropboxAppKey] = useState(getStoredAppKey);
  const [dropboxConnected, setDropboxConnected] = useState(isDropboxConnected);

  const stateRef = useRef(state);
  stateRef.current = state;
  const pushTimer = useRef(null);

  // Sends the current state to Dropbox. Leaves the pending flag set if it
  // fails, so a later attempt retries the same edits.
  const pushNow = useCallback(async (nextState) => {
    if (!isDropboxConnected()) return;
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;
      await uploadState(accessToken, nextState);
      writePending(false);
      setSyncStatus('synced');
      setSyncError('');
    } catch (err) {
      const kind = describeFailure(err);
      setSyncStatus(kind === 'auth' ? 'error' : kind);
      setSyncError(kind === 'offline' ? '' : err.message || 'Could not save to Dropbox.');
    }
  }, []);

  const schedulePush = useCallback(
    (nextState) => {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => pushNow(nextState), PUSH_DEBOUNCE_MS);
    },
    [pushNow]
  );

  // Single write path: local storage always, Dropbox too when connected.
  const applyState = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next === prev) return prev;
        writeLocalState(next);
        if (isDropboxConnected()) {
          writePending(true);
          schedulePush(next);
        }
        return next;
      });
    },
    [schedulePush]
  );

  // Convenience wrapper for changes that only touch the task list.
  const applyTasks = useCallback(
    (updater) => {
      applyState((prev) => {
        const nextTasks = typeof updater === 'function' ? updater(prev.tasks) : updater;
        if (nextTasks === prev.tasks) return prev;
        return { ...prev, tasks: nextTasks };
      });
    },
    [applyState]
  );

  // Reconciles with Dropbox. Unsynced local edits win over the remote copy;
  // otherwise the remote copy is adopted.
  const syncWithDropbox = useCallback(async () => {
    if (!isDropboxConnected()) return;

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return;

      if (readPending()) {
        await uploadState(accessToken, stateRef.current);
        writePending(false);
        setSyncStatus('synced');
        setSyncError('');
        return;
      }

      const rawRemote = await downloadState(accessToken);
      let remote = rawRemote === null ? null : normalizeState(rawRemote);
      if (remote === null) {
        // First connection for this Dropbox account (or an unreadable file):
        // seed it from whatever this device already has.
        remote = stateRef.current;
        await uploadState(accessToken, remote);
      }

      const reactivated = reactivateDueTasks(remote);
      if (reactivated !== remote) {
        await uploadState(accessToken, reactivated);
      }

      setState(reactivated);
      writeLocalState(reactivated);
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
      const local = reactivateDueTasks(readLocalState());
      writeLocalState(local);
      if (!cancelled) setState(local);

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
      applyState((prev) => reactivateDueTasks(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [applyState]);

  const addTask = useCallback(
    ({ title, dueDate, recurring, interval, categoryId }) => {
      applyTasks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title,
          dueDate: dueDate || null,
          recurring,
          interval: recurring ? interval : null,
          categoryId: categoryId || null,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [applyTasks]
  );

  const deleteTask = useCallback(
    (id) => {
      applyTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [applyTasks]
  );

  const toggleComplete = useCallback(
    (id) => {
      applyTasks((prev) =>
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
    [applyTasks]
  );

  const updateTask = useCallback(
    (id, changes) => {
      applyTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [applyTasks]
  );

  const reorderTasks = useCallback(
    (activeId, overId) => {
      applyTasks((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === activeId);
        const newIndex = prev.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [applyTasks]
  );

  const addCategory = useCallback(
    (category) => {
      applyState((prev) => ({ ...prev, categories: [...prev.categories, category] }));
    },
    [applyState]
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
    tasks: state.tasks,
    categories: state.categories,
    addTask,
    addCategory,
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

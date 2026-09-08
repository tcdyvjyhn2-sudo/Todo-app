// Reads and writes a single JSON file (/tasks.json) in this app's private
// Dropbox App Folder, using the raw HTTP API directly (no SDK dependency).
// https://developers.dropbox.com/documentation/http/documentation

const FILE_PATH = '/tasks.json';

export class DropboxAuthError extends Error {}

async function apiFetch(url, accessToken, extraHeaders, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders,
    },
    body,
  });

  if (res.status === 401) {
    throw new DropboxAuthError('Dropbox connection expired.');
  }
  return res;
}

// Returns the saved task array, or null if no file has been saved yet.
export async function downloadTasks(accessToken) {
  const res = await apiFetch(
    'https://content.dropboxapi.com/2/files/download',
    accessToken,
    { 'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }) }
  );

  if (res.status === 409) {
    const err = await res.json().catch(() => null);
    if (err?.error?.path?.['.tag'] === 'not_found') return null;
    throw new Error('Could not read your tasks from Dropbox.');
  }
  if (!res.ok) {
    throw new Error('Could not read your tasks from Dropbox.');
  }

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Overwrites /tasks.json with the given task array. Last-writer-wins by
// design - see the app's sync status text for what that means in practice.
export async function uploadTasks(accessToken, tasks) {
  const res = await apiFetch(
    'https://content.dropboxapi.com/2/files/upload',
    accessToken,
    {
      'Dropbox-API-Arg': JSON.stringify({
        path: FILE_PATH,
        mode: 'overwrite',
        mute: true,
      }),
      'Content-Type': 'application/octet-stream',
    },
    JSON.stringify(tasks)
  );

  if (!res.ok) {
    throw new Error('Could not save your tasks to Dropbox.');
  }
}

# Task List

A task list for recurring and one-off tasks, built with React and Vite. It runs
entirely in the browser and can sync between devices through your own Dropbox.

## Features

- Add tasks with an optional due date.
- Mark a task as recurring (daily, weekly, monthly, or yearly).
- Check a task off and it moves to a "Completed" section with a strikethrough.
  A recurring task returns to the active list automatically once its next due
  date arrives — checked when the app opens, when you switch back to it, and
  once a minute while it stays open. There is no fixed time of day.
- Drag the handle (⠿) on the right of any active task to reorder the list.
- Works offline. Everything is kept in the browser's local storage, so the app
  opens instantly and stays usable with no connection.
- Optional Dropbox sync so an iPhone and a Mac share one list.

## Getting started (local development)

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — build for production into `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run Oxlint.

The `docs/` folder holds a committed production build so the app can be hosted
as static files with no build step. Regenerate it with
`npm run build && rm -rf docs && cp -r dist docs && touch docs/.nojekyll`.

## Dropbox sync

Sync is off until you turn it on, and it uses your own Dropbox account. Nothing
is stored on any third-party server.

1. Host the app somewhere with a stable web address (see Hosting below).
2. Go to <https://www.dropbox.com/developers/apps> and click **Create app**.
   - API: **Scoped access**
   - Access type: **App folder** — this confines the app to a single folder,
     `Apps/<your app name>/`. It cannot see the rest of your Dropbox.
   - Give it any name.
3. On the app's **Settings** tab, under **Redirect URIs**, add the exact address
   where you host the app (for example `https://your-site.pages.dev/`) and click
   Add. The address must match character for character, including the trailing
   slash.
4. On the **Permissions** tab, enable `files.content.read` and
   `files.content.write`, then click Submit.
5. Copy the **App key** from the Settings tab.
6. Open the hosted app, paste the App key into the sync panel, click **Save**,
   then **Connect Dropbox** and approve the request. Repeat on each device.

Tasks are stored as a single `tasks.json` file inside the app folder.

### What sync does and does not do

- Changes are sent to Dropbox shortly after you make them, and the app checks
  for changes from other devices when it opens, when you switch back to it, and
  every 30 seconds.
- Offline edits are held on the device and pushed when the connection returns.
- There is no merge. If the same list is edited on two devices while one is
  offline, the edits that sync last win.

## Hosting

The build is a set of static files with relative asset paths, so it works from a
domain root or a subpath without changes.

- **Cloudflare Pages or Netlify** (works with a private repository, free):
  connect the repository, set the build command to `npm run build` and the
  output directory to `dist` — or set no build command and publish the `docs`
  folder directly.
- **GitHub Pages**: Settings → Pages → Deploy from a branch → `/docs`. Note that
  Pages serves a private repository only on a paid GitHub plan; on the free plan
  the repository must be public.

## Project structure

- `src/hooks/useTasks.js` — task state, local storage, Dropbox reconciliation.
- `src/utils/recurrence.js` — due-date formatting and next-occurrence maths.
- `src/lib/dropboxAuth.js` — OAuth 2.0 PKCE flow (no app secret is used).
- `src/lib/dropboxSession.js` — token storage and refresh.
- `src/lib/dropboxStore.js` — reads and writes `tasks.json`.
- `src/components/` — the form, the sortable list, rows, and the sync panel.

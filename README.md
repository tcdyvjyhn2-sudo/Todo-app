# Task List

A single-page task list for recurring and non-recurring tasks, built with React and Vite.

## Features

- Add tasks with an optional due date.
- Mark a task as recurring (daily, weekly, monthly, or yearly). Checking off a recurring
  task automatically rolls its due date forward to the next occurrence instead of leaving
  it permanently completed.
- Non-recurring tasks stay checked off with a strikethrough once completed.
- Drag the handle (⠿) on the right of any task to reorder the list.
- All data is stored in the browser's `localStorage` — nothing is sent to a server.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in a browser.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — build for production into `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run Oxlint.

## Project structure

- `src/hooks/useTasks.js` — task state, localStorage persistence, and recurrence logic.
- `src/utils/recurrence.js` — due-date formatting and next-occurrence calculation.
- `src/components/AddTaskForm.jsx` — the form for creating a task.
- `src/components/TaskList.jsx` — drag-and-drop list (via `@dnd-kit`).
- `src/components/TaskItem.jsx` — a single task row, including its drag handle.

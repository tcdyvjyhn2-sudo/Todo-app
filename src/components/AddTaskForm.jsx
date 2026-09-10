import { useState } from 'react';
import { INTERVALS } from '../utils/recurrence';
import { CATEGORY_COLORS } from '../utils/categoryColors';
import CategoryManager from './CategoryManager';

const NEW_CATEGORY_VALUE = '__new__';

export default function AddTaskForm({
  onAdd,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) {
  const [title, setTitle] = useState('');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [interval, setInterval] = useState('daily');
  const [categoryId, setCategoryId] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value);
  const [managingCategories, setManagingCategories] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd({
      title: trimmed,
      dueDate: hasDueDate && dueDate ? dueDate : null,
      recurring,
      interval,
      categoryId: categoryId || null,
    });

    setTitle('');
    setHasDueDate(false);
    setDueDate('');
    setRecurring(false);
    setInterval('daily');
    setCategoryId('');
    setCreatingCategory(false);
    setNewCategoryName('');
  }

  function handleCategoryChange(e) {
    const value = e.target.value;
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategory(true);
      return;
    }
    setCreatingCategory(false);
    setCategoryId(value);
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const category = { id: crypto.randomUUID(), name, color: newCategoryColor };
    onCreateCategory(category);
    setCategoryId(category.id);
    setCreatingCategory(false);
    setNewCategoryName('');
    setNewCategoryColor(CATEGORY_COLORS[0].value);
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <div className="add-task-row">
        <input
          type="text"
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="add-task-input"
          aria-label="Task title"
        />
        <button type="submit" className="add-task-submit">
          Add
        </button>
      </div>

      <div className="add-task-row add-task-options">
        <label className="add-task-recurring">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Recurring
        </label>
        {recurring && (
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="add-task-interval"
            aria-label="Recurrence interval"
          >
            {INTERVALS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <label className="add-task-recurring add-task-due-toggle">
          <input
            type="checkbox"
            checked={hasDueDate}
            onChange={(e) => setHasDueDate(e.target.checked)}
          />
          Due
        </label>
        {hasDueDate && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="add-task-date"
            aria-label="Due date"
          />
        )}
      </div>

      <div className="add-task-row add-task-options">
        <label className="field-label">
          Category
          <select
            value={creatingCategory ? NEW_CATEGORY_VALUE : categoryId}
            onChange={handleCategoryChange}
            className="add-task-interval"
            aria-label="Category"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ New category…</option>
          </select>
        </label>
        {categories.length > 0 && (
          <button
            type="button"
            className="sync-link-button"
            onClick={() => setManagingCategories(!managingCategories)}
          >
            {managingCategories ? 'Done' : 'Manage categories'}
          </button>
        )}
      </div>

      {creatingCategory && (
        <div className="add-task-row new-category-row">
          <input
            type="text"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="add-task-input"
            aria-label="New category name"
          />
          <div className="color-swatches" role="radiogroup" aria-label="Category color">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={newCategoryColor === c.value}
                aria-label={c.label}
                title={c.label}
                className={`color-swatch${newCategoryColor === c.value ? ' is-selected' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setNewCategoryColor(c.value)}
              />
            ))}
          </div>
          <button
            type="button"
            className="sync-link-button sync-link-button-primary"
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim()}
          >
            Create
          </button>
          <button
            type="button"
            className="sync-link-button"
            onClick={() => setCreatingCategory(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}
    </form>
  );
}

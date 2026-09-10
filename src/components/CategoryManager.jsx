import { useState } from 'react';
import { CATEGORY_COLORS, categoryColorHex } from '../utils/categoryColors';

export default function CategoryManager({ categories, onUpdateCategory, onDeleteCategory }) {
  const [editingColorFor, setEditingColorFor] = useState(null);

  if (categories.length === 0) {
    return <p className="category-manager-empty">No categories yet.</p>;
  }

  return (
    <ul className="category-manager">
      {categories.map((c) => (
        <li key={c.id} className="category-manager-row">
          <button
            type="button"
            className="color-swatch category-manager-swatch"
            style={{ background: categoryColorHex(c.color) }}
            aria-label={`Change color for ${c.name}`}
            title="Change color"
            onClick={() => setEditingColorFor(editingColorFor === c.id ? null : c.id)}
          />

          <input
            type="text"
            className="add-task-input category-manager-name"
            value={c.name}
            aria-label={`Category name: ${c.name}`}
            onChange={(e) => onUpdateCategory(c.id, { name: e.target.value })}
          />

          <button
            type="button"
            className="sync-link-button category-manager-delete"
            onClick={() => onDeleteCategory(c.id)}
            title="Delete category"
            aria-label={`Delete category ${c.name}`}
          >
            Delete
          </button>

          {editingColorFor === c.id && (
            <div className="color-swatches category-manager-palette" role="radiogroup" aria-label={`Color for ${c.name}`}>
              {CATEGORY_COLORS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={c.color === opt.value}
                  aria-label={opt.label}
                  title={opt.label}
                  className={`color-swatch${c.color === opt.value ? ' is-selected' : ''}`}
                  style={{ background: opt.hex }}
                  onClick={() => {
                    onUpdateCategory(c.id, { color: opt.value });
                    setEditingColorFor(null);
                  }}
                />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

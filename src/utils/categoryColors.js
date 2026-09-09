// A fixed palette rather than a free-form color picker: guarantees every
// category reads clearly as a small dot next to task titles, in either
// theme, with no contrast math needed.
export const CATEGORY_COLORS = [
  { value: 'red', hex: '#e5484d', label: 'Red' },
  { value: 'orange', hex: '#f0883e', label: 'Orange' },
  { value: 'amber', hex: '#eab308', label: 'Amber' },
  { value: 'green', hex: '#22c55e', label: 'Green' },
  { value: 'teal', hex: '#14b8a6', label: 'Teal' },
  { value: 'blue', hex: '#3b82f6', label: 'Blue' },
  { value: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { value: 'pink', hex: '#ec4899', label: 'Pink' },
];

export function categoryColorHex(value) {
  return CATEGORY_COLORS.find((c) => c.value === value)?.hex ?? '#8b8b9e';
}

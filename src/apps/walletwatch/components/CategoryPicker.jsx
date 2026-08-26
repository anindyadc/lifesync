import { getTopLevelCategories, getChildCategories } from '../constants';

const pillClass = (isSelected, cat) =>
  `px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
    isSelected
      ? `${cat.bg || 'bg-indigo-50 text-indigo-700'}`
      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
  }`;

/**
 * Shared category pill-grid selector — used by TransactionForm, MiscExpenseModal, and
 * FixedExpenses' FixedExpenseForm, which used to each duplicate this exact markup.
 * Top-level categories render first; tapping one that has children reveals those
 * children as a second, indented pill row. The parent itself stays directly selectable
 * (for users who don't need the finer split) — tapping a child just sets a more
 * specific `value`.
 */
const CategoryPicker = ({ categories, value, onChange }) => {
  const topLevel = getTopLevelCategories(categories);
  const selectedCat = categories.find(c => c.id === value);
  // Show children of whichever top-level category is currently selected, or — if a
  // child is already selected — its parent's children, so the picker doesn't collapse
  // the row out from under an already-made choice.
  const expandedParentId = selectedCat ? (selectedCat.parentId || selectedCat.id) : null;
  const children = expandedParentId ? getChildCategories(categories, expandedParentId) : [];

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5 custom-scrollbar">
        {topLevel.map(cat => {
          const isSelected = value === cat.id || cat.id === expandedParentId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              style={isSelected ? { borderColor: cat.color } : {}}
              className={pillClass(isSelected, cat)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
      {children.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-slate-100 max-h-28 overflow-y-auto p-0.5 custom-scrollbar">
          {children.map(cat => {
            const isSelected = value === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.id)}
                style={isSelected ? { borderColor: cat.color } : {}}
                className={pillClass(isSelected, cat)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryPicker;

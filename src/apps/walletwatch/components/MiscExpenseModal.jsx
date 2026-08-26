import React, { useState } from 'react';
import { Wallet, X, Loader2, Trash2 } from 'lucide-react';
import { toISODate } from '../../../lib/utils';
import CategoryPicker from './CategoryPicker';

/**
 * MiscExpenseModal — a separate entry point from the main Add Transaction form.
 * Small same-day spends (tea, auto, snacks — typically under ₹100) rarely get logged
 * in one sitting; they're jotted down at different times of day across separate app
 * opens. This modal's draft list is Firestore-backed (via useMiscExpenseDraft), so
 * closing it (or the app) doesn't lose anything — items persist until explicitly
 * combined into a single transaction.
 */
const MiscExpenseModal = ({ draftItems = [], categories, onAddItem, onRemoveItem, onSaveAsTransaction, onDiscardAll, onCancel }) => {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories?.[0]?.id || '');
  const [date, setDate] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const total = draftItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!label.trim() || !amount || Number(amount) <= 0 || adding) return;
    setError('');
    setAdding(true);
    try {
      // Only clear the inputs once the write actually succeeds — otherwise a failed
      // save (e.g. a permissions error) looked like it worked, since the fields reset
      // but no item ever showed up in the list.
      await onAddItem({ label, amount });
      setLabel('');
      setAmount('');
    } catch (err) {
      console.error('Misc expense add error:', err);
      setError(err?.message || 'Could not add that item — please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async () => {
    if (draftItems.length === 0 || !category) return;
    setError('');
    setSaving(true);
    try {
      const description = draftItems
        .map(item => `${item.label} (₹${Number(item.amount)})`)
        .join(', ');
      await onSaveAsTransaction({
        amount: total,
        description,
        category,
        group: '',
        tags: [],
        paymentMode: 'upi',
        paymentAccount: '',
        date,
        isReimbursable: false,
        isOfficial: false,
        reimbursementStatus: 'none'
      });
      await onDiscardAll();
      onCancel();
    } catch (err) {
      console.error('Misc expense save error:', err);
      setError(err?.message || 'Something went wrong — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardAll = () => {
    if (window.confirm(`Discard all ${draftItems.length} unsaved item(s)? This cannot be undone.`)) {
      onDiscardAll();
    }
  };

  const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
  const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <Wallet className="text-indigo-600" size={16} />
          Misc Expenses
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
        <p className="text-xs text-slate-400">
          For small spends (e.g. under ₹100) — add one anytime, even across separate visits, then combine everything into a single transaction whenever you're ready.
        </p>

        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Tea, Auto, Snacks"
            className={`${fieldClass} flex-1`}
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-6 pr-2 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <button
            type="submit"
            disabled={!label.trim() || !amount || Number(amount) <= 0 || adding}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
          </button>
        </form>
        {error && <p className="text-[11px] font-semibold text-red-500 -mt-2">{error}</p>}

        {draftItems.length > 0 ? (
          <>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
              {draftItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-slate-50 group">
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">{item.label}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {item.addedAt ? new Date(item.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <span className="text-sm font-bold text-slate-800 shrink-0">₹{Number(item.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-lg">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Total ({draftItems.length} item{draftItems.length !== 1 ? 's' : ''})</span>
              <span className="text-lg font-bold text-indigo-900">₹{total.toFixed(2)}</span>
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <CategoryPicker categories={categories || []} value={category} onChange={setCategory} />
            </div>

            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            <button
              type="button"
              onClick={handleDiscardAll}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} /> Discard all
            </button>
          </>
        ) : (
          <p className="text-center text-xs text-slate-300 italic py-6">Nothing added yet — jot one down above.</p>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 bg-white">
        <button
          type="button"
          disabled={draftItems.length === 0 || !category || saving}
          onClick={handleSave}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : `Save as Transaction${draftItems.length > 0 ? ` (₹${total.toFixed(2)})` : ''}`}
        </button>
      </div>
    </div>
  );
};

export default MiscExpenseModal;

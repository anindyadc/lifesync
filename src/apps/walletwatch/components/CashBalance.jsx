import React, { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2, Wallet, Calendar, TrendingUp, TrendingDown, CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate, toISODate } from '../../../lib/utils';
import ConfirmModal from './ConfirmModal';

const parseISODate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const GapChip = ({ gap }) => {
  const rounded = Math.round(gap);
  if (rounded === 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={11} /> Matched
      </span>
    );
  }
  const short = rounded < 0;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${short ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
      {short ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
      {short ? 'Short' : 'Surplus'} {formatCurrency(Math.abs(gap))}
    </span>
  );
};

/**
 * WalletWatch Cash Balance — a manual monthly reconciliation ledger (see
 * useCashBalance.js). Each entry is a physical cash count; the app computes what the
 * balance *should* be from logged cash transactions since the last count and shows the
 * gap, so an unlogged cash return (or any other untracked cash movement) surfaces as a
 * concrete number rather than silently vanishing.
 */
const CashBalance = ({ snapshots, loading, currentExpectedBalance, computeExpected, addSnapshot, updateSnapshot, deleteSnapshot }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [deleteSnapshotId, setDeleteSnapshotId] = useState(null);

  const liveExpected = useMemo(() => currentExpectedBalance(), [currentExpectedBalance]);
  const latest = snapshots[0] || null;

  const openAdd = () => { setEditingSnapshot(null); setIsFormOpen(true); };
  const openEdit = (snap) => { setEditingSnapshot(snap); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); setEditingSnapshot(null); };

  const handleFormSubmit = async (data) => {
    if (editingSnapshot) {
      await updateSnapshot(editingSnapshot.id, data);
    } else {
      await addSnapshot(data);
    }
    closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteSnapshotId) return;
    await deleteSnapshot(deleteSnapshotId);
    setDeleteSnapshotId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 text-sm font-medium italic">Loading cash balance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <ConfirmModal
        isOpen={!!deleteSnapshotId}
        title="Delete Cash Count"
        message="Permanently remove this cash balance entry? Later entries' recorded gaps are unaffected — they were frozen when saved."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteSnapshotId(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Expected Cash In Hand {latest ? `· since ${formatDate(latest.asOfDate)} count` : '· no counts yet'}
            </p>
            <p className="text-lg font-black text-slate-900">{formatCurrency(liveExpected)}</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> Count Cash
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No cash counts yet</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Count the cash in hand and log it monthly — the app compares it against logged cash transactions so an untracked deposit (like a return paid in cash) shows up as a gap instead of vanishing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {snapshots.map(snap => (
            <div key={snap.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={11} /> {formatDate(snap.asOfDate)}
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(snap.actualBalance)}</p>
                  <p className="text-[11px] text-slate-400 font-medium">Expected {formatCurrency(snap.expectedBalance)}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => openEdit(snap)} aria-label="Edit cash count" title="Edit" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteSnapshotId(snap.id)} aria-label="Delete cash count" title="Delete" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <GapChip gap={snap.gap} />
                {snap.note && <p className="text-xs text-slate-500 font-medium truncate max-w-[55%]" title={snap.note}>{snap.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center" onClick={closeForm}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <CashSnapshotForm initialData={editingSnapshot} computeExpected={computeExpected} onSubmit={handleFormSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CashBalance;

const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

/**
 * CashSnapshotForm — add/edit a cash count. Live-recomputes the expected balance/gap
 * preview as the date or amount changes (via computeExpected), so you see the gap before
 * you even save.
 */
const CashSnapshotForm = ({ initialData, computeExpected, onSubmit, onCancel }) => {
  const [asOfDate, setAsOfDate] = useState(initialData ? toISODate(initialData.asOfDate) : toISODate(new Date()));
  const [actualBalance, setActualBalance] = useState(initialData?.actualBalance ?? '');
  const [note, setNote] = useState(initialData?.note || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const d = parseISODate(asOfDate);
    return computeExpected(d, initialData?.id ?? null);
  }, [asOfDate, computeExpected, initialData]);

  const actualNum = Number(actualBalance);
  const previewGap = preview === null || isNaN(actualNum) ? null : actualNum - preview;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actualBalance === '' || isNaN(actualNum) || actualNum < 0) return setError('Enter the counted cash amount (0 or more).');
    setError('');
    setSaving(true);
    try {
      await onSubmit({ asOfDate: parseISODate(asOfDate), actualBalance: actualNum, note: note.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <Wallet className="text-indigo-600" size={16} />
          {initialData ? 'Edit Cash Count' : 'Count Cash'}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div>
            <label className={labelClass}><Calendar size={11} className="inline -mt-0.5" /> As of Date</label>
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>Cash Counted</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full pl-7 pr-3 py-2 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {preview === null ? 'First count — sets your starting point' : 'Expected (from last count + logged cash transactions)'}
            </p>
            <p className="text-base font-black text-slate-800">{preview === null ? '—' : formatCurrency(preview)}</p>
            {previewGap !== null && preview !== null && (
              <p className={`text-xs font-bold ${Math.round(previewGap) === 0 ? 'text-emerald-600' : Math.round(previewGap) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {Math.round(previewGap) === 0 ? 'Matches exactly' : previewGap < 0 ? `Short by ${formatCurrency(Math.abs(previewGap))}` : `Surplus of ${formatCurrency(previewGap)}`}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Note (optional)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Diwali gift cash, FD maturity paid in hand..."
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </div>

          {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 bg-white">
          <button type="submit" disabled={saving} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (initialData ? 'Update Count' : 'Save Count')}
          </button>
        </div>
      </form>
    </div>
  );
};

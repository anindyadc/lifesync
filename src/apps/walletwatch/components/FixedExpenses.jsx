import React, { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Pause, Play, CheckCircle2, Clock, AlertTriangle, X, Loader2,
  Repeat, SkipForward, Calendar, CreditCard, History, ChevronDown, LayoutGrid, List,
} from 'lucide-react';
import { formatCurrency, formatDate, toISODate, safeGetDate } from '../../../lib/utils';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, PAYMENT_MODES } from '../constants';
import ConfirmModal from './ConfirmModal';
import { monthKeyOf } from '../hooks/useFixedExpenses';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const periodLabel = (tpl) => tpl.periodStartDay === tpl.periodEndDay
  ? `Due the ${ordinal(tpl.periodStartDay)}`
  : `Due ${ordinal(tpl.periodStartDay)}–${ordinal(tpl.periodEndDay)}`;

// Status is derived rather than stored on the template itself, since it depends on
// "today" and on whichever instance (if any) has been generated for the current month —
// see useFixedExpenses' generation effect for why an instance may not exist yet even
// though the template's window has technically opened (it appears on the next snapshot).
const computeStatus = (tpl, currentInstance) => {
  if (!tpl.active) return 'paused';
  if (currentInstance) {
    if (currentInstance.status === 'paid') return 'paid';
    if (currentInstance.status === 'skipped') return 'skipped';
    const dueEnd = safeGetDate(currentInstance.dueEnd);
    return dueEnd && new Date() > dueEnd ? 'overdue' : 'due';
  }
  return new Date().getDate() >= tpl.periodStartDay ? 'due' : 'upcoming';
};

const STATUS_META = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 },
  due: { label: 'Due', className: 'bg-amber-100 text-amber-600', icon: Clock },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-600', icon: AlertTriangle },
  upcoming: { label: 'Not due yet', className: 'bg-slate-100 text-slate-500', icon: Clock },
  paused: { label: 'Paused', className: 'bg-slate-100 text-slate-400', icon: Pause },
  skipped: { label: 'Skipped', className: 'bg-slate-100 text-slate-400', icon: SkipForward },
};

// Persisted across visits, same pattern as TaskFlow's My Tasks / WalletWatch's
// History card-vs-list toggle.
const VIEW_MODE_KEY = 'walletwatch-fixedexpenses-view-mode';

const StatusChip = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.due;
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${meta.className}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
};

const FixedExpenses = ({ templates, instances, categories, allExpenses = [], loading, addTemplate, updateTemplate, toggleTemplateActive, deleteTemplate, markPaid, skipInstance }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState(null);
  const [payingContext, setPayingContext] = useState(null); // { template, instance }
  const [expandedHistory, setExpandedHistory] = useState({}); // { [templateId]: boolean }
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'card';
    } catch {
      return 'card';
    }
  });

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* ignore (private browsing, etc.) */ }
  };

  const monthKey = monthKeyOf(new Date());

  const rows = useMemo(() => templates.map(tpl => {
    const currentInstance = instances.find(i => i.templateId === tpl.id && i.monthKey === monthKey);
    const carriedOver = instances
      .filter(i => i.templateId === tpl.id && i.status === 'pending' && i.monthKey !== monthKey)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return { tpl, currentInstance, carriedOver, status: computeStatus(tpl, currentInstance) };
  }), [templates, instances, monthKey]);

  const summary = useMemo(() => {
    const pending = instances.filter(i => i.status === 'pending');
    return {
      count: pending.length,
      total: pending.reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0),
      overdue: pending.filter(i => {
        const dueEnd = safeGetDate(i.dueEnd);
        return dueEnd && new Date() > dueEnd;
      }).length,
    };
  }, [instances]);

  const openAdd = () => { setEditingTemplate(null); setIsFormOpen(true); };
  const openEdit = (tpl) => { setEditingTemplate(tpl); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); setEditingTemplate(null); };

  const handleFormSubmit = async (data) => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, data);
    } else {
      await addTemplate(data);
    }
    closeForm();
  };

  const confirmDelete = async () => {
    if (!deleteTemplateId) return;
    await deleteTemplate(deleteTemplateId);
    setDeleteTemplateId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 text-sm font-medium italic">Loading fixed expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <ConfirmModal
        isOpen={!!deleteTemplateId}
        title="Delete Fixed Expense"
        message="This stops future months from being generated. Already-paid history stays exactly as it is."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTemplateId(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Repeat size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending This Month & Overdue</p>
            <p className="text-lg font-black text-slate-900">
              {formatCurrency(summary.total)}
              <span className="text-xs font-semibold text-slate-400 ml-1.5">
                &middot; {summary.count} bill{summary.count !== 1 ? 's' : ''}
                {summary.overdue > 0 && <span className="text-red-500"> &middot; {summary.overdue} overdue</span>}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => changeViewMode('card')}
              aria-label="Card view"
              title="Card view"
              aria-pressed={viewMode === 'card'}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => changeViewMode('list')}
              aria-label="List view"
              title="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={15} />
            </button>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Add Fixed Expense
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Repeat size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No fixed expenses yet</h4>
          <p className="text-sm text-slate-500 mt-2">Track rent, EMIs, or subscriptions — they'll come due automatically each month.</p>
        </div>
      ) : (
        <div className={viewMode === 'card' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'flex flex-col gap-2'}>
          {rows.map(({ tpl, currentInstance, carriedOver, status }) => {
            const RowComponent = viewMode === 'card' ? FixedExpenseCard : FixedExpenseRow;
            return (
              <RowComponent
                key={tpl.id}
                tpl={tpl}
                currentInstance={currentInstance}
                carriedOver={carriedOver}
                status={status}
                category={categories.find(c => c.id === tpl.category)}
                allExpenses={allExpenses}
                expanded={!!expandedHistory[tpl.id]}
                onToggleHistory={() => setExpandedHistory(prev => ({ ...prev, [tpl.id]: !prev[tpl.id] }))}
                onToggleActive={() => toggleTemplateActive(tpl.id, !tpl.active)}
                onEdit={() => openEdit(tpl)}
                onDelete={() => setDeleteTemplateId(tpl.id)}
                onPay={(instance) => setPayingContext({ template: tpl, instance })}
                onSkip={(instanceId) => skipInstance(instanceId)}
              />
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center" onClick={closeForm}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <FixedExpenseForm initialData={editingTemplate} categories={categories} onSubmit={handleFormSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}

      {payingContext && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center" onClick={() => setPayingContext(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <MarkPaidForm
              context={payingContext}
              onSubmit={async (overrides) => { await markPaid(payingContext.instance, overrides); setPayingContext(null); }}
              onCancel={() => setPayingContext(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedExpenses;

// Shared by both FixedExpenseCard and FixedExpenseRow so "carried over unpaid" instances
// (from a prior month, still pending) render identically regardless of view mode.
const CarriedOverList = ({ carriedOver, onPay, onSkip }) => (
  <div className="space-y-1.5">
    {carriedOver.map(inst => (
      <div key={inst.id} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
        <span className="font-bold text-red-600">Also unpaid: {inst.monthKey}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPay(inst)} className="px-2 py-0.5 bg-white text-emerald-600 rounded-md font-bold hover:bg-emerald-50 border border-emerald-200">
            Pay
          </button>
          <button onClick={() => onSkip(inst.id)} className="px-2 py-0.5 bg-white text-slate-500 rounded-md font-bold hover:bg-slate-50 border border-slate-200">
            Skip
          </button>
        </div>
      </div>
    ))}
  </div>
);

/**
 * FixedExpenseCard — the original bento-card layout, used in Card view.
 */
const FixedExpenseCard = ({ tpl, currentInstance, carriedOver, status, category, allExpenses, expanded, onToggleHistory, onToggleActive, onEdit, onDelete, onPay, onSkip }) => {
  const CategoryIcon = CATEGORY_ICONS[tpl.category] || DEFAULT_CATEGORY_ICON;
  const canMarkPaid = currentInstance && currentInstance.status === 'pending';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category?.bg || 'bg-slate-100'}`}>
          <CategoryIcon size={18} className="opacity-70" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 truncate">{tpl.label}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {periodLabel(tpl)} &middot; {category?.label || tpl.category}
          </p>
        </div>
        <div className="flex gap-0.5 shrink-0 -mr-1 -mt-1">
          <button onClick={onToggleActive} aria-label={tpl.active ? 'Pause' : 'Resume'} title={tpl.active ? 'Pause' : 'Resume'} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
            {tpl.active ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={onEdit} aria-label="Edit fixed expense" title="Edit" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
          <button onClick={onDelete} aria-label="Delete fixed expense" title="Delete" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="font-black text-base text-slate-900">{formatCurrency(tpl.amount)}</span>
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          {canMarkPaid && (
            <button
              onClick={() => onPay(currentInstance)}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 shadow-sm transition-all active:scale-95 text-xs font-bold"
            >
              <CheckCircle2 size={13} /> Mark Paid
            </button>
          )}
        </div>
      </div>

      {carriedOver.length > 0 && <div className="pt-1"><CarriedOverList carriedOver={carriedOver} onPay={onPay} onSkip={onSkip} /></div>}

      <PaymentHistory templateId={tpl.id} allExpenses={allExpenses} expanded={expanded} onToggle={onToggleHistory} />
    </div>
  );
};

/**
 * FixedExpenseRow — dense single-line layout for List view, same pattern as
 * TaskFlow's TaskRow / WalletWatch's TransactionRow: a `sm:grid-cols-[...]` row sized to
 * fill the row's actual width, with carried-over/payment-history detail collapsed below.
 */
const FixedExpenseRow = ({ tpl, currentInstance, carriedOver, status, category, allExpenses, expanded, onToggleHistory, onToggleActive, onEdit, onDelete, onPay, onSkip }) => {
  const CategoryIcon = CATEGORY_ICONS[tpl.category] || DEFAULT_CATEGORY_ICON;
  const canMarkPaid = currentInstance && currentInstance.status === 'pending';

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-3 sm:grid sm:grid-cols-[2fr_1fr_auto_auto] sm:items-center sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${category?.bg || 'bg-slate-100'}`}>
            <CategoryIcon size={15} className="opacity-70" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 truncate">{tpl.label}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{category?.label || tpl.category}</p>
          </div>
        </div>
        <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">{periodLabel(tpl)}</p>
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-black text-sm text-slate-900">{formatCurrency(tpl.amount)}</span>
          <StatusChip status={status} />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {canMarkPaid && (
            <button
              onClick={() => onPay(currentInstance)}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 shadow-sm transition-all active:scale-95 text-[11px] font-bold"
            >
              <CheckCircle2 size={12} /> <span className="hidden md:inline">Mark Paid</span>
            </button>
          )}
          <button onClick={onToggleActive} aria-label={tpl.active ? 'Pause' : 'Resume'} title={tpl.active ? 'Pause' : 'Resume'} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
            {tpl.active ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={onEdit} aria-label="Edit fixed expense" title="Edit" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
          <button onClick={onDelete} aria-label="Delete fixed expense" title="Delete" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Amount/period/status collapse onto a second line below sm, where the grid above hides them. */}
      <div className="flex sm:hidden items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">{periodLabel(tpl)}</span>
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-900">{formatCurrency(tpl.amount)}</span>
          <StatusChip status={status} />
        </div>
      </div>

      {carriedOver.length > 0 && <CarriedOverList carriedOver={carriedOver} onPay={onPay} onSkip={onSkip} />}

      <PaymentHistory templateId={tpl.id} allExpenses={allExpenses} expanded={expanded} onToggle={onToggleHistory} />
    </div>
  );
};

/**
 * PaymentHistory — past paid instances for one template (matched via
 * `fixedExpenseTemplateId`, set by useFixedExpenses' markPaid), so you can see a bill's
 * trend over time (e.g. "has my electricity bill been creeping up?") instead of only
 * ever seeing this month's status.
 */
const PaymentHistory = ({ templateId, allExpenses, expanded, onToggle }) => {
  const payments = useMemo(
    () => allExpenses
      .filter(e => e.fixedExpenseTemplateId === templateId)
      .sort((a, b) => (safeGetDate(b.date) || 0) - (safeGetDate(a.date) || 0)),
    [allExpenses, templateId]
  );

  if (payments.length === 0) return null;

  return (
    <div className="pt-1 border-t border-slate-100">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span className="flex items-center gap-1.5"><History size={12} /> Payment History ({payments.length})</span>
        <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-1 pb-1 animate-in fade-in duration-150">
          {payments.slice(0, 12).map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1">
              <span className="text-slate-500 font-medium">{formatDate(p.date)}</span>
              <span className="font-bold text-slate-800">{formatCurrency(Math.abs(p.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

/**
 * FixedExpenseForm — add/edit a recurring template. Mirrors TransactionForm's dense
 * fintech visual system (section labels, compact inputs, category pills) for consistency.
 */
const FixedExpenseForm = ({ initialData, categories, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(() => initialData ? {
    label: initialData.label || '',
    amount: initialData.amount ?? '',
    category: initialData.category || (categories[0]?.id || ''),
    paymentMode: initialData.paymentMode || 'upi',
    paymentAccount: initialData.paymentAccount || '',
    periodStartDay: initialData.periodStartDay ?? 1,
    periodEndDay: initialData.periodEndDay ?? 5,
    isOfficial: !!initialData.isOfficial,
    active: initialData.active !== false,
  } : {
    label: '', amount: '', category: categories[0]?.id || '', paymentMode: 'upi', paymentAccount: '',
    periodStartDay: 1, periodEndDay: 5, isOfficial: false, active: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);
    const start = Number(formData.periodStartDay);
    const end = Number(formData.periodEndDay);
    if (!formData.label.trim()) return setError('Give it a name.');
    if (!formData.amount || isNaN(amountNum) || amountNum <= 0) return setError('Enter an amount greater than 0.');
    if (!formData.category) return setError('Pick a category.');
    if (!Number.isInteger(start) || start < 1 || start > 31) return setError('Period start day must be 1–31.');
    if (!Number.isInteger(end) || end < 1 || end > 31) return setError('Period end day must be 1–31.');
    if (end < start) return setError('Period end day must be on or after the start day.');
    setError('');
    setSaving(true);
    try {
      await onSubmit({ ...formData, periodStartDay: start, periodEndDay: end });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <Repeat className="text-indigo-600" size={16} />
          {initialData ? 'Edit Fixed Expense' : 'New Fixed Expense'}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div>
            <label className={labelClass}>Label</label>
            <input type="text" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} placeholder="e.g. Rent, Netflix, Car EMI" className={fieldClass} autoFocus />
          </div>

          <div>
            <label className={labelClass}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5 custom-scrollbar">
              {categories.map(cat => {
                const isSelected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id} type="button" onClick={() => setFormData({ ...formData, category: cat.id })}
                    style={isSelected ? { borderColor: cat.color } : {}}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${isSelected ? `${cat.bg || 'bg-indigo-50 text-indigo-700'}` : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>Due window (day of month)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="31" value={formData.periodStartDay} onChange={(e) => setFormData({ ...formData, periodStartDay: e.target.value })} className={`${fieldClass} w-20`} />
              <span className="text-slate-300 text-xs">to</span>
              <input type="number" min="1" max="31" value={formData.periodEndDay} onChange={(e) => setFormData({ ...formData, periodEndDay: e.target.value })} className={`${fieldClass} w-20`} />
              <span className="text-[11px] text-slate-400 font-medium">Use the same day twice for a single due date</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Payment</label>
              <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} className={fieldClass}>
                {PAYMENT_MODES.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Account</label>
              <input type="text" value={formData.paymentAccount} onChange={(e) => setFormData({ ...formData, paymentAccount: e.target.value })} placeholder="e.g. HDFC" className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.isOfficial ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <input type="checkbox" checked={formData.isOfficial} onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 shrink-0" />
              <span className={`text-xs font-semibold ${formData.isOfficial ? 'text-blue-900' : 'text-slate-700'}`}>Official</span>
            </label>
            <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.active ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
              <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 shrink-0" />
              <span className={`text-xs font-semibold ${formData.active ? 'text-indigo-900' : 'text-slate-700'}`}>Active</span>
            </label>
          </div>

          {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 bg-white">
          <button type="submit" disabled={saving} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (initialData ? 'Update Fixed Expense' : 'Save Fixed Expense')}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * MarkPaidForm — confirms + optionally adjusts amount/date/payment details before
 * converting a due instance into a real transaction (bills like utilities often vary
 * from the template's default amount).
 */
const MarkPaidForm = ({ context, onSubmit, onCancel }) => {
  const { template, instance } = context;
  const [amount, setAmount] = useState(instance.amount ?? template.amount);
  const [date, setDate] = useState(toISODate(new Date()));
  const [paymentMode, setPaymentMode] = useState(instance.paymentMode || 'upi');
  const [paymentAccount, setPaymentAccount] = useState(instance.paymentAccount || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ amount, date, paymentMode, paymentAccount });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <CheckCircle2 className="text-emerald-500" size={16} /> Mark Paid — {instance.label}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <div>
            <label className={labelClass}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}><Calendar size={11} className="inline -mt-0.5" /> Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}><CreditCard size={11} className="inline -mt-0.5" /> Payment</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={fieldClass}>
                {PAYMENT_MODES.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Account</label>
            <input type="text" value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} placeholder="e.g. HDFC" className={fieldClass} />
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 bg-white">
          <button type="submit" disabled={saving} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Paid'}
          </button>
        </div>
      </form>
    </div>
  );
};

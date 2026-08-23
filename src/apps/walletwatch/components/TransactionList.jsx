import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import {
  CreditCard, Trash2, Pencil, RefreshCcw, Folder, ChevronDown, Tag, Filter, XCircle,
  Link2, MapPin, Search, ArrowUpDown, Calendar, Wallet, Download, FileText, Loader2,
  LayoutGrid, List, Repeat, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, getTagColor, safeGetDate } from '../../../lib/utils';
import { PAYMENT_MODES, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, isSettledSpend, getAccountKey, getAvailableTags } from '../constants';
import { downloadExpensesCSV, downloadExpensesPDF } from '../hooks/useExport';

const VIEW_MODE_KEY = 'walletwatch-transactionlist-view-mode';

// "Today / Yesterday / This Week / Earlier" sectioning for the flat Individual view —
// only meaningful while sorted chronologically (see showDateBuckets below).
const getDateBucket = (date) => {
  if (!date) return 'Earlier';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - dayStart) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
};

// Same "Spent / Lent / Official" split as the Dashboard's KPI row (isSettledSpend),
// so a month/event group's headline number means the same thing everywhere in the app
// instead of a raw sum of signed amounts (which understates spend once a positive
// reimbursement entry lands in the same bucket).
const getGroupTotals = (items) => ({
  spent: items.filter(isSettledSpend).reduce((s, e) => s + Math.abs(Number(e.amount)), 0),
  lent: items.filter(e => e.reimbursementStatus === 'pending' && !e.isOfficial).reduce((s, e) => s + Math.abs(Number(e.amount)), 0),
  official: items.filter(e => e.isOfficial && Number(e.amount) < 0).reduce((s, e) => s + Math.abs(Number(e.amount)), 0),
});

/**
 * MultiSelectFilter
 * Compact checkbox-list dropdown for facets with many/variable values (tags, trips,
 * accounts) where a native <select> only allows picking one at a time.
 */
const MultiSelectFilter = ({ label, icon: Icon, options, selected, onToggle, onSetSelected }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (options.length === 0) return null;

  const allSelected = selected.length === options.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
          selected.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        {Icon && <Icon size={13} />}
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 min-w-[170px] max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between gap-2 px-2 pb-1.5 mb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => onSetSelected(allSelected ? [] : [...options])}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {options.map(opt => {
            const isChecked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(opt)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 shrink-0"
                />
                <span className="truncate">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * TransactionList Component
 * Optimized for clear settlement visibility.
 */
const TransactionList = ({ expenses, categories, onEdit, onDelete, onSettle, onSettleGroup }) => {
  const [grouping, setGrouping] = useState('month'); // 'none', 'month', 'event'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [expandedTransactionGroups, setExpandedTransactionGroups] = useState({});
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterScope, setFilterScope] = useState(''); // '' | 'personal' | 'official'
  const [filterReimbursement, setFilterReimbursement] = useState(''); // '' | 'pending' | 'settled'
  const [filterTags, setFilterTags] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [filterAccounts, setFilterAccounts] = useState([]);
  const [filterPaymentModes, setFilterPaymentModes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  // Persisted across visits (not just this session), same pattern as TaskFlow's
  // My Tasks view toggle — a standing display preference, not per-transaction state.
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

  const toggleInArray = (setter) => (value) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const availableTags = useMemo(() => getAvailableTags(expenses), [expenses]);

  // Every expense's `group` field doubles as a trip/event tag (e.g. "Trip: Goa Dec 2025"),
  // so this filter lets a frequent traveler isolate one trip's transactions to review/export.
  const availableGroups = useMemo(() => {
    const groupsSet = new Set();
    expenses.forEach(exp => { if (exp.group) groupsSet.add(exp.group); });
    return Array.from(groupsSet).sort();
  }, [expenses]);

  const availableAccounts = useMemo(() => {
    const accountsSet = new Set();
    expenses.forEach(exp => accountsSet.add(getAccountKey(exp)));
    return Array.from(accountsSet).sort();
  }, [expenses]);

  const expenseById = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.id] = e; });
    return map;
  }, [expenses]);

  // A reversed range (From after To) would otherwise just silently filter every
  // transaction out with no explanation — string comparison is valid here since both
  // are 'YYYY-MM-DD'. Surfaced in the UI below; the range itself is ignored while invalid
  // rather than producing a confusing "no results".
  const dateRangeInvalid = !!(dateFrom && dateTo && dateFrom > dateTo);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = (dateFrom && !dateRangeInvalid) ? safeGetDate(dateFrom) : null;
    const to = (dateTo && !dateRangeInvalid) ? safeGetDate(dateTo) : null;

    return expenses.filter(exp => {
      if (filterCategory && exp.category !== filterCategory) return false;
      if (filterScope === 'personal' && exp.isOfficial) return false;
      if (filterScope === 'official' && !exp.isOfficial) return false;
      if (filterReimbursement && exp.reimbursementStatus !== filterReimbursement) return false;
      if (filterTags.length > 0 && !(exp.tags || []).some(t => filterTags.includes(t))) return false;
      if (filterGroups.length > 0 && !filterGroups.includes(exp.group)) return false;
      if (filterAccounts.length > 0 && !filterAccounts.includes(getAccountKey(exp))) return false;
      if (filterPaymentModes.length > 0 && !filterPaymentModes.includes(exp.paymentMode)) return false;

      if (from || to) {
        const expDate = safeGetDate(exp.date);
        if (!expDate) return false;
        if (from && expDate < from) return false;
        if (to && expDate > to) return false;
      }

      if (query) {
        const haystack = [
          exp.description,
          exp.group,
          exp.paymentAccount,
          categories.find(c => c.id === exp.category)?.label,
          PAYMENT_MODES.find(m => m.id === exp.paymentMode)?.label,
          ...(exp.tags || []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [expenses, categories, filterCategory, filterScope, filterReimbursement, filterTags, filterGroups, filterAccounts, filterPaymentModes, dateFrom, dateTo, dateRangeInvalid, search]);

  const sortedExpenses = useMemo(() => {
    const arr = [...filteredExpenses];
    arr.sort((a, b) => {
      if (sortBy === 'date-asc') return safeGetDate(a.date) - safeGetDate(b.date);
      if (sortBy === 'amount-desc') return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
      if (sortBy === 'amount-asc') return Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
      return safeGetDate(b.date) - safeGetDate(a.date);
    });
    return arr;
  }, [filteredExpenses, sortBy]);

  const hasActiveFilters = !!(
    search.trim() || filterCategory || filterScope || filterReimbursement || filterTags.length || filterGroups.length ||
    filterAccounts.length || filterPaymentModes.length || dateFrom || dateTo
  );

  const clearAllFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterScope('');
    setFilterReimbursement('');
    setFilterTags([]);
    setFilterGroups([]);
    setFilterAccounts([]);
    setFilterPaymentModes([]);
    setDateFrom('');
    setDateTo('');
  };

  const handleExportCsv = () => downloadExpensesCSV(sortedExpenses, categories, 'walletwatch-history.csv');
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExpensesPDF(sortedExpenses, categories, { title: 'WalletWatch Transaction History', filename: 'walletwatch-history.pdf' });
    } catch (err) {
      console.error('History PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const groupedData = useMemo(() => {
    if (grouping === 'month') {
      const monthlyGroups = {};
      sortedExpenses.forEach(expense => {
        const date = safeGetDate(expense.date);
        // A missing/malformed date used to crash this whole grouping pass — now it just
        // falls into its own bucket instead of taking down History for every transaction.
        const monthYear = date ? date.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date';
        if (!monthlyGroups[monthYear]) {
          monthlyGroups[monthYear] = [];
        }
        monthlyGroups[monthYear].push(expense);
      });
      const totals = {};
      Object.entries(monthlyGroups).forEach(([key, items]) => { totals[key] = getGroupTotals(items); });
      return { monthlyGroups, totals };
    }

    if (grouping === 'event') {
      const eventGroups = {};
      sortedExpenses.forEach(e => {
        if (e.group) {
          if (!eventGroups[e.group]) eventGroups[e.group] = [];
          eventGroups[e.group].push(e);
        }
      });
      const totals = {};
      Object.entries(eventGroups).forEach(([key, items]) => { totals[key] = getGroupTotals(items); });
      return { eventGroups, totals };
    }

    return {};
  }, [sortedExpenses, grouping]);

  const groupKeysSignature = useMemo(
    () => Object.keys(groupedData.monthlyGroups || groupedData.eventGroups || {}).join('|'),
    [groupedData]
  );

  // Reset expand/collapse state whenever the grouping mode or the set of group
  // labels changes — adjusted during render (React's documented pattern for
  // "state depends on a changed prop", same as TransactionForm's lastCheckedGroup)
  // rather than in an effect, so the same-groups snapshot echo doesn't re-collapse
  // everything and there's no extra render pass.
  const groupResetKey = `${grouping}|${groupKeysSignature}`;
  const [lastGroupResetKey, setLastGroupResetKey] = useState(groupResetKey);
  if (groupResetKey !== lastGroupResetKey) {
    setLastGroupResetKey(groupResetKey);
    setShowAll(false);
    setShowAllGroups(false);
    setExpandedTransactionGroups({});

    const groupKeys = groupKeysSignature ? groupKeysSignature.split('|') : [];
    const firstGroup = groupKeys[0];
    const initialCollapsedState = {};
    groupKeys.forEach(key => {
      initialCollapsedState[key] = key !== firstGroup;
    });
    setCollapsedGroups(initialCollapsedState);
  }

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleTransactionGroup = (groupKey) => {
    setExpandedTransactionGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const renderGroupTotals = ({ spent, lent, official }) => (
    <div className="text-right">
      <span className="font-black text-slate-900 text-sm">{formatCurrency(spent)}</span>
      {(lent > 0 || official > 0) && (
        <div className="flex items-center gap-1 justify-end mt-0.5">
          {lent > 0 && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">+{formatCurrency(lent)} lent</span>}
          {official > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{formatCurrency(official)} official</span>}
        </div>
      )}
    </div>
  );

  // A settle can link back to one original (`relatedId`, the everyday single-item Settle
  // flow) or to several at once (`relatedIds`, from a group Settle All — see
  // onSettleGroup/renderGroupedByEvent) — this resolves either shape to one display string
  // so TransactionCard/Row don't need to know which flow produced the entry.
  const relatedLabelFor = (exp) => {
    if (exp.relatedId) {
      const original = expenseById[exp.relatedId];
      return original ? `Refund for "${original.description}"` : null;
    }
    if (exp.relatedIds && exp.relatedIds.length > 0) {
      return `Refund for ${exp.relatedIds.length} item${exp.relatedIds.length !== 1 ? 's' : ''}`;
    }
    return null;
  };

  // Shared by every grouping mode (month/event/individual, bucketed or not) so card vs.
  // list rendering only needs to be decided in one place.
  const renderTransactionItems = (items) => (
    viewMode === 'card' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3 bg-slate-50/50 animate-in fade-in duration-200">
        {items.map(exp => (
          <TransactionCard key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} relatedLabel={relatedLabelFor(exp)} />
        ))}
      </div>
    ) : (
      <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
        {items.map(exp => (
          <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} relatedLabel={relatedLabelFor(exp)} />
        ))}
      </div>
    )
  );

  const renderGroupedByMonth = () => {
    const monthEntries = Object.entries(groupedData.monthlyGroups);
    const groupsToShow = showAllGroups ? monthEntries : monthEntries.slice(0, 3);
    return (
      <div className="space-y-2">
        {groupsToShow.map(([monthYear, monthExpenses]) => {
          const isTransactionListExpanded = !!expandedTransactionGroups[monthYear];
          const transactionsToShow = isTransactionListExpanded ? monthExpenses : monthExpenses.slice(0, 5);

          return (
            <div key={monthYear} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
              <button
                onClick={() => toggleGroup(monthYear)}
                className="p-4 w-full flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50"
              >
                <h4 className="font-bold text-slate-800">{monthYear}</h4>
                <div className="flex items-center gap-4">
                  {renderGroupTotals(groupedData.totals[monthYear])}
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[monthYear] && 'rotate-180'}`} />
                </div>
              </button>
              {!collapsedGroups[monthYear] && (
                <div className="animate-in fade-in duration-200">
                  {renderTransactionItems(transactionsToShow)}
                  {monthExpenses.length > 5 && (
                    <div className="p-2 text-center">
                      <button
                        onClick={() => toggleTransactionGroup(monthYear)}
                        className="text-indigo-600 font-bold text-xs hover:underline"
                      >
                        {isTransactionListExpanded ? 'Show Less' : `Show ${monthExpenses.length - 5} More`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {monthEntries.length > 3 && (
          <div className="p-4 text-center">
            <button
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="text-indigo-600 font-bold text-xs hover:underline"
            >
              {showAllGroups ? 'Show Less' : `Show ${monthEntries.length - 3} More Months`}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGroupedByEvent = () => {
    const eventEntries = Object.entries(groupedData.eventGroups);
    const groupsToShow = showAllGroups ? eventEntries : eventEntries.slice(0, 3);
    return (
      <div className="space-y-2">
        {groupsToShow.map(([name, items]) => {
          const isTransactionListExpanded = !!expandedTransactionGroups[name];
          const transactionsToShow = isTransactionListExpanded ? items : items.slice(0, 5);
          // Any still-pending item in the group (personal lend or official-trip claim
          // alike — unlike the `lent`/`official` totals split, this deliberately doesn't
          // care which) can be swept into one bulk Settle All instead of settling each
          // transaction individually.
          const pendingItems = items.filter(e => e.reimbursementStatus === 'pending');

          return (
            <div key={name} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
              <div className="w-full flex items-center bg-slate-50/50 hover:bg-slate-100/50">
                <button
                  onClick={() => toggleGroup(name)}
                  className="flex-1 min-w-0 p-4 flex justify-between items-center text-left"
                >
                   <div className="flex items-center gap-3 min-w-0">
                     <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0"><Folder size={18}/></div>
                     <h4 className="font-bold text-slate-800 truncate">{name}</h4>
                   </div>
                   <div className="flex items-center gap-4 shrink-0">
                    {renderGroupTotals(groupedData.totals[name])}
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[name] && 'rotate-180'}`} />
                  </div>
                </button>
                {onSettleGroup && pendingItems.length > 0 && (
                  <button
                    onClick={() => onSettleGroup(pendingItems, name)}
                    className="mr-3 shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold whitespace-nowrap transition-all active:scale-95"
                    title={`Settle all ${pendingItems.length} pending item${pendingItems.length !== 1 ? 's' : ''} in this group at once`}
                  >
                    <RefreshCcw size={12}/> Settle All ({pendingItems.length})
                  </button>
                )}
              </div>
               {!collapsedGroups[name] && (
                <div className="animate-in fade-in duration-200">
                    {renderTransactionItems(transactionsToShow)}
                    {items.length > 5 && (
                      <div className="p-2 text-center">
                        <button
                          onClick={() => toggleTransactionGroup(name)}
                          className="text-indigo-600 font-bold text-xs hover:underline"
                        >
                          {isTransactionListExpanded ? 'Show Less' : `Show ${items.length - 5} More`}
                        </button>
                      </div>
                    )}
                </div>
               )}
            </div>
          );
        })}
        {eventEntries.length > 3 && (
          <div className="p-4 text-center">
            <button
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="text-indigo-600 font-bold text-xs hover:underline"
            >
              {showAllGroups ? 'Show Less' : `Show ${eventEntries.length - 3} More Events`}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderIndividual = () => {
    const transactionsToShow = showAll ? sortedExpenses : sortedExpenses.slice(0, 10);
    // Relative-date sectioning only makes sense while sorted chronologically —
    // an amount-sorted list isn't in date order, so bucketing it would be misleading.
    const showDateBuckets = sortBy.startsWith('date');

    const showMore = sortedExpenses.length > 10 && (
      <div className="p-4 text-center">
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-indigo-600 font-bold text-xs hover:underline"
        >
          {showAll ? 'Show Less' : `Show ${sortedExpenses.length - 10} More`}
        </button>
      </div>
    );

    if (!showDateBuckets) {
      return (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
          {renderTransactionItems(transactionsToShow)}
          {showMore}
        </div>
      );
    }

    const buckets = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
    transactionsToShow.forEach(exp => {
      buckets[getDateBucket(safeGetDate(exp.date))].push(exp);
    });

    return (
      <div className="space-y-3">
        {Object.entries(buckets).filter(([, items]) => items.length > 0).map(([bucket, items]) => (
          <div key={bucket} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wide">{bucket}</div>
            {renderTransactionItems(items)}
          </div>
        ))}
        {showMore}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3">
        {/* Row 1: title, result count, search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-bold text-slate-800">Transaction History</h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Showing {sortedExpenses.length} of {expenses.length}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, tag, trip..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/40 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <XCircle size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => changeViewMode('card')}
                aria-label="Card view"
                title="Card view"
                aria-pressed={viewMode === 'card'}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={15}/>
              </button>
              <button
                onClick={() => changeViewMode('list')}
                aria-label="List view"
                title="List view"
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={15}/>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: facet filters */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <Filter size={13} className="text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {[['', 'All'], ['personal', 'Personal'], ['official', 'Official']].map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => setFilterScope(value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  filterScope === value ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* reimbursementStatus filter — the only way to isolate "Lent"/"Settled" items
              before this was scanning for the badge on every row by eye. */}
          <div className="flex items-center gap-1">
            {[['', 'Any Status'], ['pending', 'Lent'], ['settled', 'Settled']].map(([value, label]) => (
              <button
                key={value || 'any-status'}
                type="button"
                onClick={() => setFilterReimbursement(value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  filterReimbursement === value ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <MultiSelectFilter label="Tags" icon={Tag} options={availableTags} selected={filterTags} onToggle={toggleInArray(setFilterTags)} onSetSelected={setFilterTags} />
          <MultiSelectFilter label="Trips" icon={MapPin} options={availableGroups} selected={filterGroups} onToggle={toggleInArray(setFilterGroups)} onSetSelected={setFilterGroups} />
          <MultiSelectFilter label="Accounts" icon={CreditCard} options={availableAccounts} selected={filterAccounts} onToggle={toggleInArray(setFilterAccounts)} onSetSelected={setFilterAccounts} />

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            {PAYMENT_MODES.map(mode => {
              const isSelected = filterPaymentModes.includes(mode.id);
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => toggleInArray(setFilterPaymentModes)(mode.id)}
                  title={mode.label}
                  className={`p-1.5 rounded-lg border transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >
                  <ModeIcon size={14} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none"
            />
            <span className="text-slate-300 text-xs">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none"
            />
            {dateRangeInvalid && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500" title="From date is after To date — the range is being ignored">
                <AlertCircle size={12} /> From is after To
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              aria-label="Clear all filters"
              title="Clear all filters"
            >
              <XCircle size={14} /> Clear
            </button>
          )}
        </div>

        {/* Row 3: grouping, sort, export */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setGrouping('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              By Month
            </button>
            <button
              onClick={() => setGrouping('event')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'event' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              By Event
            </button>
            <button
              onClick={() => setGrouping('none')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'none' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              Individual
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
              </select>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={sortedExpenses.length === 0}
              className="p-2 bg-white text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export filtered results as CSV"
            >
              <FileText size={15} />
            </button>
            <button
              onClick={handleExportPdf}
              disabled={sortedExpenses.length === 0 || exportingPdf}
              className="p-2 bg-white text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export filtered results as PDF"
            >
              {exportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            </button>
          </div>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No transactions yet</h4>
          <p className="text-sm text-slate-500 mt-2">Tap "Add Entry" above to log your first transaction.</p>
        </div>
      ) : sortedExpenses.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No transactions match your filters</h4>
          <p className="text-sm text-slate-500 mt-2">Try changing or clearing the search, category, scope, tag, account, or date filters above.</p>
        </div>
      ) : (
        <>
          {grouping === 'month' && renderGroupedByMonth()}
          {grouping === 'event' && renderGroupedByEvent()}
          {grouping === 'none' && renderIndividual()}
        </>
      )}
    </div>
  );
};


/**
 * TransactionCard
 * Card-grid counterpart to TransactionRow (same fields, same handlers) — lets a group's
 * transactions lay out as a responsive multi-column grid instead of one stacked column,
 * mirroring TaskFlow's My Tasks card view.
 */
const TransactionCard = memo(({ exp, categories, onEdit, onDelete, onSettle, relatedLabel }) => {
  const category = categories.find(c => c.id === exp.category);
  const CategoryIcon = CATEGORY_ICONS[exp.category] || DEFAULT_CATEGORY_ICON;
  const paymentMode = PAYMENT_MODES.find(m => m.id === exp.paymentMode);
  const PaymentIcon = paymentMode?.icon;
  const accountLabel = exp.paymentAccount?.trim() || paymentMode?.label;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category?.bg || 'bg-slate-100'}`}>
          <CategoryIcon size={18} className="opacity-70" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 truncate">{exp.description}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {formatDate(exp.date)} • {category?.label || exp.category}
          </p>
        </div>
        <div className="flex gap-0.5 shrink-0 -mr-1 -mt-1">
          <button onClick={() => onEdit(exp)} aria-label="Edit transaction" title="Edit" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Pencil size={14}/></button>
          <button onClick={() => onDelete(exp.id)} aria-label="Delete transaction" title="Delete" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
        </div>
      </div>

      {relatedLabel && (
        <p className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold uppercase tracking-wider">
          <Link2 size={9} /> {relatedLabel}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {accountLabel && (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500">
            {PaymentIcon && <PaymentIcon size={9} />} {accountLabel}
          </span>
        )}
        {exp.tags?.map(tag => {
          const colors = getTagColor(tag);
          return (
            <span key={tag} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} border-opacity-50`}>
              <Tag size={8} /> {tag}
            </span>
          );
        })}
        {exp.reimbursementStatus === 'pending' && (
          <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Lent</span>
        )}
        {exp.reimbursementStatus === 'settled' && (
          <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Settled</span>
        )}
        {exp.isOfficial && (
          <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Official</span>
        )}
        {exp.isFixedExpense && (
          <span className="flex items-center gap-0.5 text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
            <Repeat size={9} /> Fixed
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className={`font-black text-base ${exp.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(exp.amount)}</span>
        {exp.reimbursementStatus === 'pending' && (
          <button
            onClick={() => onSettle(exp)}
            className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 shadow-sm transition-all active:scale-95 text-xs font-bold"
            title="Settle / Refund"
          >
            <RefreshCcw size={13}/> Settle
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * TransactionRow
 * Settlement button (RefreshCcw) is now always visible for 'pending' items
 * to ensure users can find it immediately.
 */
// Grid-based row (sm+) — description | date+account | tags | amount | actions each get a
// share of the row's actual width, and date/account sit on one line instead of account
// being pushed into the tag-wrap row below, now that there's room to fit both. Below sm
// it collapses to a single stacked column (grid-cols-1), same as before.
const TransactionRow = memo(({ exp, categories, onEdit, onDelete, onSettle, relatedLabel }) => {
  const category = categories.find(c => c.id === exp.category);
  const CategoryIcon = CATEGORY_ICONS[exp.category] || DEFAULT_CATEGORY_ICON;
  const paymentMode = PAYMENT_MODES.find(m => m.id === exp.paymentMode);
  const PaymentIcon = paymentMode?.icon;
  const accountLabel = exp.paymentAccount?.trim() || paymentMode?.label;

  return (
    <div className="p-3 hover:bg-slate-50 transition-colors group">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_minmax(140px,190px)_minmax(0,1.1fr)_minmax(90px,auto)_auto] sm:items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${category?.bg || 'bg-slate-100'}`}>
            <CategoryIcon size={16} className="opacity-70" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800 truncate">{exp.description}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{category?.label || exp.category}</p>
            {relatedLabel && (
              <p className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold uppercase tracking-wider mt-1">
                <Link2 size={9} /> {relatedLabel}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-12 sm:pl-0 min-w-0">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0">
            <Calendar size={11} className="text-slate-400" /> {formatDate(exp.date)}
          </span>
          {accountLabel && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 truncate">
              {PaymentIcon && <PaymentIcon size={9} />} {accountLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 pl-12 sm:pl-0">
          {exp.tags?.map(tag => {
            const colors = getTagColor(tag);
            return (
              <span key={tag} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} border-opacity-50`}>
                <Tag size={8} /> {tag}
              </span>
            );
          })}
        </div>

        <div className="flex flex-col items-start sm:items-end pl-12 sm:pl-0">
          <span className={`font-black text-sm ${exp.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(exp.amount)}</span>
          {exp.reimbursementStatus === 'pending' && (
            <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1 animate-pulse">Lent</span>
          )}
          {exp.reimbursementStatus === 'settled' && (
            <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1">Settled</span>
          )}
          {exp.isOfficial && (
            <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1">Official</span>
          )}
          {exp.isFixedExpense && (
            <span className="flex items-center gap-0.5 text-[8px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1">
              <Repeat size={8} /> Fixed
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 justify-end pl-12 sm:pl-0 shrink-0">
          {exp.reimbursementStatus === 'pending' && (
            <button
              onClick={() => onSettle(exp)}
              className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 shadow-sm transition-all active:scale-90"
              title="Settle / Refund"
            >
              <RefreshCcw size={16}/>
            </button>
          )}
          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
            <button onClick={() => onEdit(exp)} aria-label="Edit transaction" title="Edit" className="p-2 text-slate-400 sm:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={14}/></button>
            <button onClick={() => onDelete(exp.id)} aria-label="Delete transaction" title="Delete" className="p-2 text-slate-400 sm:text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TransactionList;

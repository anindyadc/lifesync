import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CreditCard, Trash2, Pencil, RefreshCcw, Folder, ChevronDown, Tag, Filter, XCircle,
  Link2, MapPin, Search, ArrowUpDown, Calendar, Wallet, Download, FileText, Loader2
} from 'lucide-react';
import { formatCurrency, formatDate, getTagColor, safeGetDate } from '../../../lib/utils';
import { PAYMENT_MODES, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, isSettledSpend, getAccountKey } from '../constants';
import { downloadExpensesCSV, downloadExpensesPDF } from '../hooks/useExport';

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
const MultiSelectFilter = ({ label, icon: Icon, options, selected, onToggle }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (options.length === 0) return null;

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
        <div className="absolute z-20 mt-1 min-w-[170px] max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
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
const TransactionList = ({ expenses, categories, onEdit, onDelete, onSettle }) => {
  const [grouping, setGrouping] = useState('month'); // 'none', 'month', 'event'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [expandedTransactionGroups, setExpandedTransactionGroups] = useState({});
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTags, setFilterTags] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [filterAccounts, setFilterAccounts] = useState([]);
  const [filterPaymentModes, setFilterPaymentModes] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const toggleInArray = (setter) => (value) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const availableTags = useMemo(() => {
    const tagsSet = new Set();
    expenses.forEach(exp => {
      if (exp.tags && Array.isArray(exp.tags)) {
        exp.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).sort();
  }, [expenses]);

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

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = dateFrom ? safeGetDate(dateFrom) : null;
    const to = dateTo ? safeGetDate(dateTo) : null;

    return expenses.filter(exp => {
      if (filterCategory && exp.category !== filterCategory) return false;
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
          ...(exp.tags || []),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [expenses, categories, filterCategory, filterTags, filterGroups, filterAccounts, filterPaymentModes, dateFrom, dateTo, search]);

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
    search.trim() || filterCategory || filterTags.length || filterGroups.length ||
    filterAccounts.length || filterPaymentModes.length || dateFrom || dateTo
  );

  const clearAllFilters = () => {
    setSearch('');
    setFilterCategory('');
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
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!monthlyGroups[monthYear]) {
          monthlyGroups[monthYear] = [];
        }
        monthlyGroups[monthYear].push(expense);
      });
      return { monthlyGroups };
    }

    if (grouping === 'event') {
      const eventGroups = {};
      sortedExpenses.forEach(e => {
        if (e.group) {
          if (!eventGroups[e.group]) eventGroups[e.group] = [];
          eventGroups[e.group].push(e);
        }
      });
      return { eventGroups };
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
                  {renderGroupTotals(getGroupTotals(monthExpenses))}
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[monthYear] && 'rotate-180'}`} />
                </div>
              </button>
              {!collapsedGroups[monthYear] && (
                <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
                  {transactionsToShow.map(exp => (
                    <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} relatedExpense={exp.relatedId ? expenseById[exp.relatedId] : null} />
                  ))}
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

          return (
            <div key={name} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
              <button
                onClick={() => toggleGroup(name)}
                className="p-4 w-full flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50"
              >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Folder size={18}/></div>
                   <h4 className="font-bold text-slate-800">{name}</h4>
                 </div>
                 <div className="flex items-center gap-4">
                  {renderGroupTotals(getGroupTotals(items))}
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[name] && 'rotate-180'}`} />
                </div>
              </button>
               {!collapsedGroups[name] && (
                <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
                    {transactionsToShow.map(exp => (
                      <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} relatedExpense={exp.relatedId ? expenseById[exp.relatedId] : null} />
                    ))}
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
          <div className="divide-y divide-slate-50">
            {transactionsToShow.map(exp => (
              <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
            ))}
          </div>
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
            <div className="divide-y divide-slate-50">
              {items.map(exp => (
                <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
              ))}
            </div>
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
          <div className="relative w-full sm:w-64">
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

          <MultiSelectFilter label="Tags" icon={Tag} options={availableTags} selected={filterTags} onToggle={toggleInArray(setFilterTags)} />
          <MultiSelectFilter label="Trips" icon={MapPin} options={availableGroups} selected={filterGroups} onToggle={toggleInArray(setFilterGroups)} />
          <MultiSelectFilter label="Accounts" icon={CreditCard} options={availableAccounts} selected={filterAccounts} onToggle={toggleInArray(setFilterAccounts)} />

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
          <p className="text-sm text-slate-500 mt-2">Try changing or clearing the search, category, tag, account, or date filters above.</p>
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
 * TransactionRow
 * Settlement button (RefreshCcw) is now always visible for 'pending' items
 * to ensure users can find it immediately.
 */
const TransactionRow = ({ exp, categories, onEdit, onDelete, onSettle, relatedExpense }) => {
  const category = categories.find(c => c.id === exp.category);
  const CategoryIcon = CATEGORY_ICONS[exp.category] || DEFAULT_CATEGORY_ICON;
  const paymentMode = PAYMENT_MODES.find(m => m.id === exp.paymentMode);
  const PaymentIcon = paymentMode?.icon;
  const accountLabel = exp.paymentAccount?.trim() || paymentMode?.label;

  return (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category?.bg || 'bg-slate-100'}`}>
          <CategoryIcon size={18} className="opacity-70" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">{exp.description}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {formatDate(exp.date)} • {category?.label || exp.category}
          </p>
          {relatedExpense && (
            <p className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold uppercase tracking-wider mt-1">
              <Link2 size={9} /> Refund for "{relatedExpense.description}"
            </p>
          )}
          {(exp.tags?.length > 0 || accountLabel) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
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
            </div>
          )}
        </div>
      </div>
      <div className="text-right flex items-center gap-4 mt-4 sm:mt-0">
        <div className="flex flex-col items-end">
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
        </div>
        <div className="flex items-center gap-1">
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
};

export default TransactionList;

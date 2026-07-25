import React, { useMemo, useState } from 'react';
import {
  Wallet, Clock, Calendar, Receipt, PieChart, Layers, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, CreditCard, Download, FileText, Loader2, X
} from 'lucide-react';
import { downloadExpensesCSV, downloadExpensesPDF } from '../hooks/useExport';
import { PAYMENT_MODES, OTHER_SLOT, STATUS_COLORS, CATEGORICAL_PALETTE, isSettledSpend, getAccountKey } from '../constants';
import { formatCurrency, safeGetDate } from '../../../lib/utils';
import { MonthlyTrendChart, WeeklyBarChart, DailyCalendar } from './OverviewCharts';

const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;

const MonthNavigator = ({ selectedMonth, setSelectedMonth }) => {
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100" aria-label="Previous month">
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-lg font-bold text-slate-800">
        {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </h2>
      <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100" aria-label="Next month">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

// Receives its data + selected month from WalletWatchApp (src/apps/walletwatch/index.jsx),
// which is also what the header CSV/PDF export buttons and History view read from —
// a single source of truth, so "export" always matches whatever month is on screen here.
//
// Layout is a "bento" grid rather than a fixed main-column/sidebar split: the top row
// pairs the two time-based visuals (compact calendar heatmap + 6-month trend), and every
// breakdown card below flows into a responsive 1/2/3-col grid. Each breakdown card already
// returns null when it has nothing to show for the month (e.g. no official trips) — since
// a null child renders no DOM node, the grid never reserves empty space for it, so no
// separate "does the sidebar have anything to show" check is needed here.
const Dashboard = ({ categories, expenses, allExpenses, selectedMonth, setSelectedMonth }) => {
  return (
    <div>
      <MonthNavigator selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      <SummaryCards expenses={expenses} allExpenses={allExpenses} selectedMonth={selectedMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2">
          <DailyCalendar expenses={expenses} categories={categories} selectedMonth={selectedMonth} />
        </div>
        <div className="lg:col-span-3">
          <MonthlyTrendChart allExpenses={allExpenses} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <CategoryBreakdown categories={categories} expenses={expenses} />
        <WeeklyBarChart expenses={allExpenses} />
        <PaymentModeBreakdown expenses={expenses} />
        <PaymentAccountBreakdown expenses={expenses} categories={categories} />
        <GroupSubtotals categories={categories} expenses={expenses} />
        <OfficialTripsSummary categories={categories} allExpenses={allExpenses} />
      </div>
    </div>
  );
};

export default Dashboard;

/**
 * SummaryCards — 4-tile KPI row.
 * "Total Spent" carries a delta vs. the prior month (good=green when spend fell,
 * critical=red when it rose) using the reserved status colors, never a category hue.
 */
export const SummaryCards = ({ expenses, allExpenses = [], selectedMonth }) => {
  const stats = useMemo(() => {
    const personalExpenses = expenses.filter(e => !e.isOfficial);
    const spent = personalExpenses.filter(isSettledSpend).reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    const lent = personalExpenses
      .filter(e => e.reimbursementStatus === 'pending')
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);

    const prevMonthDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const prevKey = monthKey(prevMonthDate);
    const prevSpent = allExpenses
      .filter(e => {
        const d = safeGetDate(e.date);
        return d && monthKey(d) === prevKey && isSettledSpend(e);
      })
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);

    const today = new Date();
    const isCurrentMonth = monthKey(today) === monthKey(selectedMonth);
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
    const avgDaily = daysElapsed > 0 ? spent / daysElapsed : 0;

    const deltaPct = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;

    return { spent, lent, avgDaily, count: personalExpenses.length, deltaPct };
  }, [expenses, allExpenses, selectedMonth]);

  const deltaUp = stats.deltaPct !== null && stats.deltaPct > 0;
  const deltaColor = stats.deltaPct === null ? null : (deltaUp ? STATUS_COLORS.critical : STATUS_COLORS.good);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-sans">
      <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-4">
        <div className="p-3 bg-white/10 text-white rounded-xl shrink-0">
          <Wallet size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total Spent</p>
          <p className="text-xl font-black text-white truncate">{formatCurrency(stats.spent)}</p>
          {stats.deltaPct !== null && (
            <p className="flex items-center gap-1 text-[10px] font-bold mt-0.5" style={{ color: deltaColor }}>
              {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(stats.deltaPct)}% vs last month
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
          <Clock size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Reimbursement</p>
          <p className="text-xl font-black text-slate-900 truncate">{formatCurrency(stats.lent)}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
          <Calendar size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Daily Spend</p>
          <p className="text-xl font-black text-slate-900 truncate">{formatCurrency(stats.avgDaily)}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0">
          <Receipt size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transactions Logged</p>
          <p className="text-xl font-black text-slate-900 truncate">{stats.count}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * GroupSubtotals — "Top Trips & Events (Personal)".
 * Every expense's `group` field doubles as a trip tag (e.g. "Trip: Goa Dec 2025") —
 * this card ranks them and the drill-down modal gives a per-category breakdown plus
 * a scoped CSV/PDF export for just that trip. Official (employer-reimbursed) trips
 * are excluded here — see OfficialTripsSummary below for those.
 */
export const GroupSubtotals = ({ expenses, categories }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const groups = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (e.group && e.amount < 0 && !e.isOfficial) {
        if (!map[e.group]) {
          map[e.group] = { total: 0, items: [] };
        }
        map[e.group].total += Math.abs(Number(e.amount) || 0);
        map[e.group].items.push(e);
      }
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5 trips/events
  }, [expenses]);

  const tripCategoryBreakdown = useMemo(() => {
    if (!selectedGroup) return [];
    const totals = {};
    selectedGroup.items.forEach(e => {
      const cat = categories.find(c => c.id === e.category);
      const key = cat?.id || e.category;
      if (!totals[key]) totals[key] = { label: cat?.label || e.category, color: cat?.color || OTHER_SLOT.color, value: 0 };
      totals[key].value += Math.abs(Number(e.amount) || 0);
    });
    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [selectedGroup, categories]);

  const handleExportCsv = () => {
    downloadExpensesCSV(selectedGroup.items, categories, `trip-${selectedGroup.name.replace(/[^a-z0-9]+/gi, '-')}.csv`);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExpensesPDF(selectedGroup.items, categories, {
        title: `Trip Report: ${selectedGroup.name}`,
        filename: `trip-${selectedGroup.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`,
      });
    } catch (err) {
      console.error('Trip PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (groups.length === 0) return null;

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
        <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <Layers size={14} className="text-indigo-500" /> Top Trips & Events (Personal)
        </h3>
        <div className="space-y-4">
          {groups.map((g, i) => (
            <div
              key={i}
              className="flex justify-between items-center cursor-pointer group min-h-[44px]"
              onClick={() => setSelectedGroup(g)}
            >
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{g.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{g.items.length} transaction{g.items.length !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(g.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Layers size={20} className="text-indigo-600" />
                    {selectedGroup.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedGroup.total)} across {selectedGroup.items.length} transactions</p>
                </div>
                <button onClick={() => setSelectedGroup(null)} aria-label="Close" className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleExportCsv} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 shadow-sm border border-slate-100 min-h-[40px]">
                  <FileText size={14} /> CSV
                </button>
                <button onClick={handleExportPdf} disabled={exportingPdf} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 shadow-sm border border-slate-100 disabled:opacity-50 min-h-[40px]">
                  {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {tripCategoryBreakdown.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">By Category</p>
                  {tripCategoryBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-600">{c.label}</span>
                      </div>
                      <span className="text-slate-900">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {selectedGroup.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {safeGetDate(exp.date)?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-slate-900 shrink-0">{formatCurrency(Math.abs(exp.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * OfficialTripsSummary — employer-reimbursed trips, reported separately from personal
 * spend. Scoped to `allExpenses` (not the month navigator) since a reimbursement claim
 * usually covers a whole trip regardless of which calendar month it's currently viewed in.
 */
export const OfficialTripsSummary = ({ allExpenses, categories }) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const trips = useMemo(() => {
    const map = {};
    allExpenses.forEach(e => {
      if (e.isOfficial && e.amount < 0) {
        const key = e.group && e.group.trim() ? e.group.trim() : 'Unspecified Trip';
        if (!map[key]) map[key] = { total: 0, items: [] };
        map[key].total += Math.abs(Number(e.amount) || 0);
        map[key].items.push(e);
      }
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [allExpenses]);

  const tripCategoryBreakdown = useMemo(() => {
    if (!selectedTrip) return [];
    const totals = {};
    selectedTrip.items.forEach(e => {
      const cat = categories.find(c => c.id === e.category);
      const key = cat?.id || e.category;
      if (!totals[key]) totals[key] = { label: cat?.label || e.category, color: cat?.color || OTHER_SLOT.color, value: 0 };
      totals[key].value += Math.abs(Number(e.amount) || 0);
    });
    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [selectedTrip, categories]);

  const handleExportCsv = () => {
    downloadExpensesCSV(selectedTrip.items, categories, `official-trip-${selectedTrip.name.replace(/[^a-z0-9]+/gi, '-')}.csv`);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExpensesPDF(selectedTrip.items, categories, {
        title: `Official Trip Reimbursement Report: ${selectedTrip.name}`,
        filename: `official-trip-${selectedTrip.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`,
      });
    } catch (err) {
      console.error('Official trip PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (trips.length === 0) return null;

  const grandTotal = trips.reduce((acc, t) => acc + t.total, 0);

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm font-sans">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-blue-500 flex items-center gap-2 text-[10px] uppercase tracking-widest">
            <Receipt size={14} className="text-blue-500" /> Official Trips (Reimbursable)
          </h3>
        </div>
        <p className="text-[10px] text-slate-400 font-medium mb-4">Excluded from your personal spending above &middot; {formatCurrency(grandTotal)} total pending claim</p>
        <div className="space-y-4">
          {trips.map((t, i) => (
            <div
              key={i}
              className="flex justify-between items-center cursor-pointer group min-h-[44px]"
              onClick={() => setSelectedTrip(t)}
            >
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{t.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{t.items.length} transaction{t.items.length !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{formatCurrency(t.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 bg-blue-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Receipt size={20} className="text-blue-600" />
                    {selectedTrip.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedTrip.total)} across {selectedTrip.items.length} transactions</p>
                </div>
                <button onClick={() => setSelectedTrip(null)} aria-label="Close" className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleExportCsv} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 shadow-sm border border-slate-100 min-h-[40px]">
                  <FileText size={14} /> CSV
                </button>
                <button onClick={handleExportPdf} disabled={exportingPdf} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 shadow-sm border border-slate-100 disabled:opacity-50 min-h-[40px]">
                  {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {tripCategoryBreakdown.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">By Category</p>
                  {tripCategoryBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-600">{c.label}</span>
                      </div>
                      <span className="text-slate-900">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {selectedTrip.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {safeGetDate(exp.date)?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-slate-900 shrink-0">{formatCurrency(Math.abs(exp.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * CategoryBreakdown — consolidated donut + ranked list (replaces the old separate
 * CategoryDistribution + CategorySubtotals cards, which duplicated the same data).
 * 7th+ category folds into a muted "Other" bucket (dataviz series-count ladder).
 */
export const CategoryBreakdown = ({ categories, expenses }) => {
  const [selectedCat, setSelectedCat] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const data = useMemo(() => {
    const totals = categories.map(cat => {
      const items = expenses.filter(e => e.category === cat.id && e.amount < 0 && !e.isOfficial);
      const value = items.reduce((acc, curr) => acc + Math.abs(Number(curr.amount) || 0), 0);
      return { id: cat.id, label: cat.label, color: cat.color, bg: cat.bg, value, items };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

    const visible = totals.slice(0, 6);
    const rest = totals.slice(6);
    if (rest.length > 0) {
      visible.push({
        id: '__other__',
        label: 'Other',
        color: OTHER_SLOT.color,
        bg: OTHER_SLOT.bg,
        value: rest.reduce((acc, c) => acc + c.value, 0),
        items: rest.flatMap(c => c.items),
      });
    }

    const totalVal = totals.reduce((acc, curr) => acc + curr.value, 0);
    return { visible, totalVal };
  }, [categories, expenses]);

  if (data.totalVal === 0) return null;

  const segmentPercents = data.visible.map(cat => (cat.value / data.totalVal) * 100);
  const donutSegments = data.visible.map((cat, i) => ({
    ...cat,
    percent: segmentPercents[i],
    start: segmentPercents.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
        <div className="flex items-center gap-2 mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <PieChart size={16} className="text-indigo-500" /> Category Breakdown
        </div>

        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-6">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {donutSegments.map((s, i) => (
                <circle
                  key={i}
                  cx="18" cy="18" r="15.915"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth={hoveredSlice === i ? 5 : 4}
                  strokeDasharray={`${Math.max(s.percent - 1.5, 0.5)} ${100 - s.percent + 1.5}`}
                  strokeDashoffset={-s.start}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice(i)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => setSelectedCat(s)}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredSlice !== null ? (
                <>
                  <span className="text-[8px] font-black text-slate-400 uppercase truncate max-w-[80px]">{donutSegments[hoveredSlice].label}</span>
                  <span className="text-xs font-black text-slate-800">{Math.round(donutSegments[hoveredSlice].percent)}%</span>
                </>
              ) : (
                <>
                  <span className="text-[8px] font-black text-slate-400 uppercase">Spent</span>
                  <span className="text-xs font-black text-slate-800">{formatCurrency(data.totalVal)}</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full space-y-3">
            {data.visible.map((cat, i) => (
              <div
                key={cat.id}
                className="space-y-1.5 cursor-pointer group min-h-[32px]"
                onClick={() => setSelectedCat(cat)}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-600 group-hover:text-indigo-600 transition-colors truncate">{cat.label}</span>
                  </div>
                  <span className="text-slate-900 shrink-0 ml-2">{Math.round((cat.value / data.totalVal) * 100)}% · {formatCurrency(cat.value)}</span>
                </div>
                <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(cat.value / data.totalVal) * 100}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center" style={{ backgroundColor: '#f8fafc' }}>
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedCat.color }}></div>
                  {selectedCat.label}
                </h3>
                <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedCat.value)} Total</p>
              </div>
              <button onClick={() => setSelectedCat(null)} aria-label="Close" className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {selectedCat.items.length > 0 ? (
                selectedCat.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {safeGetDate(exp.date)?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-slate-900 shrink-0">{formatCurrency(Math.abs(exp.amount))}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">No transactions found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * PaymentModeBreakdown — how spend splits across UPI/Cash/Card. Low cardinality
 * (3-4 slots) so a single segmented bar + legend reads faster than another donut.
 */
export const PaymentModeBreakdown = ({ expenses }) => {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(() => {
    const totals = PAYMENT_MODES.map(mode => ({ ...mode, value: 0 }));
    let unspecified = 0;

    expenses.filter(e => e.amount < 0 && !e.isOfficial).forEach(e => {
      const entry = totals.find(t => t.id === e.paymentMode);
      const amt = Math.abs(Number(e.amount) || 0);
      if (entry) entry.value += amt;
      else unspecified += amt;
    });

    const withData = totals.filter(t => t.value > 0);
    if (unspecified > 0) withData.push({ id: 'unspecified', label: 'Unspecified', color: OTHER_SLOT.color, value: unspecified });

    const total = withData.reduce((acc, t) => acc + t.value, 0);
    return { segments: withData.sort((a, b) => b.value - a.value), total };
  }, [expenses]);

  if (data.total === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <CreditCard size={16} className="text-indigo-500" /> Payment Mode
      </div>

      <div className="flex w-full h-3 rounded-full overflow-hidden mb-4">
        {data.segments.map((s, i) => (
          <div
            key={s.id}
            className="h-full transition-all cursor-pointer first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(s.value / data.total) * 100}%`,
              backgroundColor: s.color,
              opacity: hovered === null || hovered === i ? 1 : 0.4,
              marginLeft: i === 0 ? 0 : '2px',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        {data.segments.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center justify-between text-[11px] font-bold min-h-[28px]"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-600">{s.label}</span>
            </div>
            <span className="text-slate-900">{Math.round((s.value / data.total) * 100)}% · {formatCurrency(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * PaymentAccountBreakdown — "By Account". Consolidates spend per specific account
 * (e.g. "GPay-300", "HDFC Credit Card") rather than just the broad Payment Mode
 * bucket above; entries with no account set fall back to their Mode's label (e.g.
 * plain "Cash"). Scoped to the month navigator, since this is a monthly report.
 */
export const PaymentAccountBreakdown = ({ expenses, categories }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const data = useMemo(() => {
    const map = {};
    expenses.filter(e => e.amount < 0 && !e.isOfficial).forEach(e => {
      const key = getAccountKey(e);
      if (!map[key]) map[key] = { total: 0, items: [] };
      map[key].total += Math.abs(Number(e.amount) || 0);
      map[key].items.push(e);
    });

    const rows = Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => ({ ...r, color: CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length].color }));

    const grandTotal = rows.reduce((acc, r) => acc + r.total, 0);
    return { rows, grandTotal };
  }, [expenses]);

  const handleExportCsv = () => {
    downloadExpensesCSV(selectedAccount.items, categories, `account-${selectedAccount.name.replace(/[^a-z0-9]+/gi, '-')}.csv`);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExpensesPDF(selectedAccount.items, categories, {
        title: `Account Report: ${selectedAccount.name}`,
        filename: `account-${selectedAccount.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`,
      });
    } catch (err) {
      console.error('Account PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (data.rows.length === 0) return null;

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
        <div className="flex items-center gap-2 mb-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <CreditCard size={16} className="text-indigo-500" /> By Account
        </div>
        <p className="text-[10px] text-slate-400 font-medium mb-4">Consolidated across every card, UPI account, and cash</p>
        <div className="space-y-3">
          {data.rows.map((r, i) => (
            <div
              key={i}
              className="space-y-1.5 cursor-pointer group min-h-[32px]"
              onClick={() => setSelectedAccount(r)}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-slate-600 group-hover:text-indigo-600 transition-colors truncate">{r.name}</span>
                </div>
                <span className="text-slate-900 shrink-0 ml-2">{formatCurrency(r.total)}</span>
              </div>
              <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${data.grandTotal > 0 ? (r.total / data.grandTotal) * 100 : 0}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: '#f8fafc' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedAccount.color }}></div>
                    {selectedAccount.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedAccount.total)} across {selectedAccount.items.length} transactions</p>
                </div>
                <button onClick={() => setSelectedAccount(null)} aria-label="Close" className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleExportCsv} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 shadow-sm border border-slate-100 min-h-[40px]">
                  <FileText size={14} /> CSV
                </button>
                <button onClick={handleExportPdf} disabled={exportingPdf} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 shadow-sm border border-slate-100 disabled:opacity-50 min-h-[40px]">
                  {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {selectedAccount.items.map(exp => (
                <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{exp.description}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {safeGetDate(exp.date)?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">{formatCurrency(Math.abs(exp.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

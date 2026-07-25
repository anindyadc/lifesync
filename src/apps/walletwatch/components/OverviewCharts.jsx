import React, { useMemo, useState } from 'react';
import { TrendingUp, Activity, BarChart3, Calendar as CalendarIcon, X, FileText, Download, Loader2 } from 'lucide-react';
import { formatCurrency, toISODate, safeGetDate } from '../../../lib/utils.js';
import { isSettledSpend, OTHER_SLOT } from '../constants.js';
import { downloadExpensesCSV, downloadExpensesPDF } from '../hooks/useExport';

const ACCENT = '#4f46e5'; // brand indigo — current-period emphasis
const MUTED = '#cbd5e1'; // slate-300 — de-emphasized context bars
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Calendar day cells are too small for full formatCurrency output (₹12,345) —
// a compact form (₹12K) keeps every cell readable at any amount.
const formatCompactCurrency = (amount) => {
  if (typeof amount !== 'number') return '';
  return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
};

// DailyCalendar heat color: low-spend days stay brand indigo, high-spend days drift
// toward red so the biggest outflow days are visually flagged, not just "darker".
const INDIGO_RGB = [79, 70, 229];
const RED_RGB = [239, 68, 68];
const heatColor = (ratio) => {
  const [r1, g1, b1] = INDIGO_RGB;
  const [r2, g2, b2] = RED_RGB;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  const opacity = Math.min(0.18 + ratio * 0.72, 0.9);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * DailyCalendar
 * Month-grid heatmap of the currently selected month (Dashboard's month navigator) —
 * one cell per day, shaded by relative spend, tap/click a day to drill into its
 * transactions. `expenses` here is already scoped to the selected month by
 * useExpenses, so this only needs to bucket by day-of-month.
 */
export const DailyCalendar = ({ expenses = [], categories = [], selectedMonth }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [hovered, setHovered] = useState(null);

  const { cells, maxVal, hasData } = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const byDay = new Map();
    expenses.forEach(e => {
      if (!isSettledSpend(e)) return;
      const d = safeGetDate(e.date);
      if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, { total: 0, items: [] });
      const bucket = byDay.get(day);
      bucket.total += Math.abs(Number(e.amount) || 0);
      bucket.items.push(e);
    });

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const dayCells = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const bucket = byDay.get(day);
      dayCells.push({
        day,
        date: new Date(year, month, day),
        total: bucket?.total || 0,
        items: bucket?.items || [],
        isToday: isCurrentMonth && today.getDate() === day,
      });
    }

    const max = Math.max(...dayCells.map(c => c.total), 1);
    return {
      cells: [...Array(firstWeekday).fill(null), ...dayCells],
      maxVal: max,
      hasData: dayCells.some(c => c.total > 0),
    };
  }, [expenses, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    if (!selectedDay) return [];
    const totals = {};
    selectedDay.items.forEach(e => {
      const cat = categories.find(c => c.id === e.category);
      const key = cat?.id || e.category;
      if (!totals[key]) totals[key] = { label: cat?.label || e.category, color: cat?.color || OTHER_SLOT.color, value: 0 };
      totals[key].value += Math.abs(Number(e.amount) || 0);
    });
    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [selectedDay, categories]);

  const dayLabel = (d) => d.date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleExportCsv = () => {
    downloadExpensesCSV(selectedDay.items, categories, `expenses-${toISODate(selectedDay.date)}.csv`);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadExpensesPDF(selectedDay.items, categories, {
        title: `Expense Report: ${dayLabel(selectedDay)}`,
        filename: `expenses-${toISODate(selectedDay.date)}.pdf`,
      });
    } catch (err) {
      console.error('Daily PDF export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-[10px] uppercase tracking-widest">
            <CalendarIcon size={14} className="text-indigo-500" /> Daily Spend — {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-slate-400">
            Low
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <span key={ratio} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: heatColor(ratio) }} />
            ))}
            High
          </div>
        </div>

        {/* Weekday letters and day cells share one grid instance (not two separate
            grids) so their 7 columns are guaranteed to size identically and line up —
            two independently-sized inline-grids can drift a pixel or two apart. */}
        <div className="inline-grid grid-cols-7 gap-[3px]">
          {WEEKDAY_LABELS.map(w => (
            <div key={w} className="w-6 h-4 sm:w-7 flex items-center justify-center text-[8px] font-bold text-slate-300 uppercase">{w[0]}</div>
          ))}
          {cells.map((c, i) => {
            if (!c) return <div key={`pad-${i}`} className="w-6 h-6 sm:w-7 sm:h-7" />;
            const ratio = c.total > 0 ? c.total / maxVal : 0;
            return (
              <button
                key={c.day}
                type="button"
                disabled={c.total === 0}
                onClick={() => setSelectedDay(c)}
                onMouseEnter={() => setHovered(c.day)}
                onMouseLeave={() => setHovered(null)}
                title={`${c.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}${c.total > 0 ? ` · ${formatCompactCurrency(c.total)}` : ''}`}
                className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-sm transition-all z-0 hover:z-10 flex items-center justify-center ${c.total > 0 ? 'cursor-pointer hover:scale-125' : 'cursor-default'} ${c.isToday ? 'ring-1 ring-offset-1 ring-indigo-500' : ''}`}
                style={{ backgroundColor: c.total > 0 ? heatColor(ratio) : '#f1f5f9' }}
              >
                <span className={`text-[9px] font-bold ${c.total > 0 && ratio > 0.45 ? 'text-white' : 'text-slate-400'}`}>{c.day}</span>
                {hovered === c.day && c.total > 0 && (
                  <ChartTooltip label={c.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} value={c.total} />
                )}
              </button>
            );
          })}
        </div>

        {!hasData && (
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">No spending logged this month</p>
        )}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100" style={{ backgroundColor: '#f8fafc' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon size={18} className="text-indigo-600" />
                    {dayLabel(selectedDay)}
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedDay.total)} across {selectedDay.items.length} transactions</p>
                </div>
                <button onClick={() => setSelectedDay(null)} aria-label="Close" className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm shrink-0">
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
              {categoryBreakdown.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">By Category</p>
                  {categoryBreakdown.map((c, i) => (
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
                {selectedDay.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{exp.description}</p>
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
 * ChartTooltip
 * Small shared hover/tap tooltip for the hand-rolled bar charts below.
 * Hover on desktop; tap toggles it on touch devices (no hover event there).
 */
const ChartTooltip = ({ label, value }) => (
  <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-100">
    {label}: {formatCurrency(value)}
  </div>
);

/**
 * MonthlyTrendChart
 * Trailing 6 real months (independent of the dashboard's month navigator) so the
 * user always sees "where am I trending" regardless of which month they're browsing.
 * Emphasis form: current month in the brand accent, prior months muted gray.
 */
export const MonthlyTrendChart = ({ allExpenses = [] }) => {
  const [active, setActive] = useState(null);

  const months = useMemo(() => {
    const today = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('en-IN', { month: 'short' }), total: 0 });
    }

    allExpenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (amt >= 0 || e.reimbursementStatus === 'pending' || e.isOfficial) return;
      const d = safeGetDate(e.date);
      if (!d) return;
      const bucket = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) bucket.total += Math.abs(amt);
    });

    return buckets;
  }, [allExpenses]);

  const maxVal = Math.max(...months.map(m => m.total), 1);
  const currentIndex = months.length - 1;
  const hasData = months.some(m => m.total > 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-[10px] uppercase tracking-widest">
        <TrendingUp size={14} className="text-indigo-500" /> 6-Month Spending Trend
      </div>
      {hasData ? (
        <div className="flex items-end justify-between h-36 gap-2 sm:gap-3 px-1">
          {months.map((m, i) => (
            <div
              key={i}
              className="relative flex-1 flex flex-col justify-end items-center gap-2 h-full cursor-pointer"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              {active === i && <ChartTooltip label={m.label} value={m.total} />}
              {i === currentIndex && m.total > 0 && (
                <span className="text-[9px] font-black text-indigo-600">{formatCurrency(m.total)}</span>
              )}
              {i === currentIndex && m.total === 0 ? (
                // No spend logged yet this month — a dashed outline reads as "nothing
                // here yet" instead of the near-invisible hairline a solid 1% bar gives.
                <div
                  className="w-full h-6 rounded-t border-2 border-dashed"
                  style={{ borderColor: ACCENT, borderBottomWidth: 0, opacity: 0.4 }}
                />
              ) : (
                <div
                  className="w-full transition-all duration-500 ease-out"
                  style={{
                    height: `${Math.max((m.total / maxVal) * 100, m.total > 0 ? 4 : 1)}%`,
                    backgroundColor: i === currentIndex ? ACCENT : MUTED,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              )}
              <span className={`text-[9px] font-bold uppercase ${i === currentIndex ? 'text-indigo-600' : 'text-slate-400'}`}>{m.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-36 flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl">
          <Activity size={20} className="text-slate-200 mb-2" />
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center px-4">No spending logged in the last 6 months</p>
        </div>
      )}
    </div>
  );
};

/**
 * WeeklyBarChart Component
 * Uses String-based Y-M-D matching to bypass timezone shifts.
 */
export const WeeklyBarChart = ({ expenses }) => {
  const [active, setActive] = useState(null);

  const days = useMemo(() => {
    const dailyTotals = new Map();
    expenses.forEach(e => {
      if (e.category === 'reimbursement' || e.isOfficial) return;

      const expenseDate = safeGetDate(e.date);
      const isoKey = toISODate(expenseDate);
      if (!isoKey) return;

      const currentTotal = dailyTotals.get(isoKey) || 0;
      const amount = Math.abs(Number(e.amount) || 0);
      dailyTotals.set(isoKey, currentTotal + amount);
    });

    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      const isoKey = toISODate(d);
      const total = dailyTotals.get(isoKey) || 0;

      result.push({
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        total: total
      });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...days.map(d => d.total), 1);
  const hasData = days.some(d => d.total > 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-6 font-bold text-slate-800 text-[10px] uppercase tracking-widest"><BarChart3 size={14} className="text-indigo-500" /> Weekly Outflow</div>
      {hasData ? (
        <div className="flex items-end justify-between h-32 gap-3 px-1 border-b border-slate-100">
          {days.map((d, i) => (
            <div
              key={i}
              className="relative flex-1 flex flex-col justify-end items-center gap-2 h-full cursor-pointer"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              {active === i && d.total > 0 && <ChartTooltip label={d.day} value={d.total} />}
              <div
                className="w-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ height: `${Math.max((d.total / maxVal) * 100, d.total > 0 ? 4 : 1)}%`, borderRadius: '4px 4px 0 0' }}
              />
              <span className="text-[9px] text-slate-400 font-bold uppercase">{d.day}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl">
          <Activity size={20} className="text-slate-200 mb-2" />
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center px-4">No outflow logged in last 7 days</p>
        </div>
      )}
    </div>
  );
};

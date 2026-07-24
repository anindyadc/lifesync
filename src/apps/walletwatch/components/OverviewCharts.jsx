import React, { useMemo, useState } from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { formatCurrency, toISODate, safeGetDate } from '../../../lib/utils.js';

const ACCENT = '#4f46e5'; // brand indigo — current-period emphasis
const MUTED = '#cbd5e1'; // slate-300 — de-emphasized context bars

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

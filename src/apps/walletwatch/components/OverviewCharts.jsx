import React, { useMemo } from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { formatCurrency, toISODate } from '../../../lib/utils.js';

/**
 * NetTrendGraph Component
 */
export const NetTrendGraph = ({ expenses }) => {
  const { chartData, netTotal } = useMemo(() => {
    const daily = {};
    let total = 0;
    expenses.forEach(e => {
      const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      const dateKey = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amt = Number(e.amount) || 0;
      daily[dateKey] = (daily[dateKey] || 0) + amt;
      total += amt;
    });
    const sorted = Object.entries(daily).sort((a, b) => new Date(a[0]) - new Date(b[0])).slice(-7);
    return { chartData: sorted, netTotal: total };
  }, [expenses]);

  if (chartData.length === 0) return null;
  const vals = chartData.map(d => d[1]);
  const max = Math.max(...vals.map(Math.abs), 1);
  const points = chartData.map((d, i) => {
    const x = (i / Math.max(chartData.length - 1, 1)) * 260 + 20;
    const y = 100 - ((d[1] / max) * 40 + 50);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={14}/> Balance velocity</div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Net</p>
          <p className="text-xl font-black text-slate-900">{formatCurrency(netTotal)}</p>
        </div>
      </div>
      <div className="h-40 w-full">
        <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
          <polyline fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
      </div>
    </div>
  );
};

/**
 * WeeklyBarChart Component
 * Uses String-based Y-M-D matching to bypass timezone shifts.
 */
export const WeeklyBarChart = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const isoKey = toISODate(d);
      const dayTotal = expenses.reduce((sum, e) => {
        const expenseDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        const eIso = toISODate(expenseDate.toISOString());
        const val = Number(e.amount) || 0;
        return (eIso === isoKey && val > 0) ? sum + val : sum;
      }, 0);
      result.push({ day: d.toLocaleDateString('en-IN', { weekday: 'short' }), total: dayTotal });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...days.map(d => d.total), 1);
  const hasData = days.some(d => d.total > 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-6 font-bold text-slate-800 text-[10px] uppercase tracking-widest"><BarChart3 size={14} className="text-indigo-500" /> Weekly Outflow</div>
      {hasData ? (
        <div className="flex items-end justify-between h-32 gap-3 px-1">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1 group">
              <div className="w-full bg-slate-50 rounded-t-lg h-full flex items-end overflow-hidden">
                <div className="w-full bg-indigo-500 transition-all duration-700 ease-out rounded-t-sm" style={{ height: `${(d.total / maxVal) * 100}%` }} />
              </div>
              <span className="text-[9px] mt-3 text-slate-400 font-bold uppercase">{d.day.charAt(0)}</span>
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

import React, { useMemo } from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

// Helper to reliably parse date from Firestore or String
const parseDate = (dateField) => {
  if (!dateField) return new Date();
  if (dateField.toDate && typeof dateField.toDate === 'function') return dateField.toDate();
  if (dateField.seconds) return new Date(dateField.seconds * 1000);
  return new Date(dateField);
};

/**
 * NetTrendGraph Component
 * Shows the line chart of balance velocity over the last 7 active days.
 */
export const NetTrendGraph = ({ expenses }) => {
  const { chartData, netTotal } = useMemo(() => {
    const daily = {};
    let total = 0;

    expenses.forEach(e => {
      const date = parseDate(e.date);
      if (isNaN(date)) return;

      const dateKey = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amt = Number(e.amount) || 0;

      // For the balance trend, we aggregate everything (inflows and outflows)
      daily[dateKey] = (daily[dateKey] || 0) + amt;
      total += amt;
    });

    // Sort and get last 7 entries
    const sorted = Object.entries(daily)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-7);

    return { chartData: sorted, netTotal: total };
  }, [expenses]);

  if (chartData.length < 1) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
        <Activity size={32} className="opacity-20" />
        <p className="text-sm italic font-medium">Add transactions to see flow trends</p>
      </div>
    );
  }

  // Visual Logic
  const vals = chartData.map(d => d[1]);
  const max = Math.max(...vals.map(Math.abs), 1);
  const height = 100, width = 300, padding = 20;

  const points = chartData.length > 1
    ? chartData.map((d, i) => {
        const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((d[1] / max) * (height / 2) + (height / 2));
        return `${x},${y}`;
      }).join(' ')
    : `${padding},${height/2} ${width-padding},${height/2}`;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
          <TrendingUp size={16}/> Net Flow
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Balance</p>
          <p className="text-xl font-black text-slate-900">{formatCurrency(netTotal)}</p>
        </div>
      </div>

      <div className="h-40 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {chartData.map((d, i) => {
            const x = chartData.length > 1 ? (i / (chartData.length - 1)) * (width - padding * 2) + padding : width / 2;
            const y = height - ((d[1] / max) * (height / 2) + (height / 2));
            return <circle key={i} cx={x} cy={y} r="4" fill="#4338ca" />;
          })}
        </svg>
      </div>
    </div>
  );
};

/**
 * WeeklyBarChart Component
 * Shows a bar chart for daily spending for the current week.
 */
export const WeeklyBarChart = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' });

      const total = expenses.filter(e => {
        const eDate = parseDate(e.date);
        return eDate.toDateString() === d.toDateString();
      }).reduce((sum, e) => {
        const val = Number(e.amount) || 0;
        return sum + (val > 0 ? val : 0); // Only count outflows (spending) for activity
      }, 0);

      result.push({ day: dayLabel, total });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...days.map(d => d.total), 1);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-6 font-bold text-slate-800 text-[10px] uppercase tracking-widest">
        <BarChart3 size={14} className="text-indigo-500" /> Weekly Activity
      </div>

      <div className="flex items-end justify-between h-32 gap-3">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 group">
            <div className="w-full bg-slate-50 rounded-t-lg h-full flex items-end overflow-hidden">
              <div
                className="w-full bg-indigo-500 transition-all duration-1000 ease-out rounded-t-sm"
                style={{ height: `${(d.total / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-[10px] mt-3 text-slate-400 font-bold uppercase">{d.day.charAt(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

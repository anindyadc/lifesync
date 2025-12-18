import React, { useMemo } from 'react';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export const NetTrendGraph = ({ expenses }) => {
  const { chartData, netTotal } = useMemo(() => {
    const daily = {};
    let total = 0;
    expenses.forEach(e => {
      const rawDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      if (isNaN(rawDate)) return;
      const dateKey = rawDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amt = Number(e.amount) || 0;
      daily[dateKey] = (daily[dateKey] || 0) + amt;
      total += amt;
    });
    const sorted = Object.entries(daily).sort((a, b) => new Date(a[0]) - new Date(b[0])).slice(-7);
    return { chartData: sorted, netTotal: total };
  }, [expenses]);

  if (chartData.length < 2) return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
      <Activity size={32} className="opacity-20" />
      <p className="text-sm italic font-medium">Log daily transactions to see trends</p>
    </div>
  );

  const max = Math.max(...chartData.map(d => Math.abs(d[1])), 1);
  const height = 100, width = 300, padding = 20;
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d[1] / max) * (height / 2) + (height / 2));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest"><TrendingUp size={16}/> Net Flow Velocity</div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Net Balance</p>
          <p className="text-xl font-black text-slate-900">{formatCurrency(netTotal)}</p>
        </div>
      </div>
      <div className="h-48 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <polyline fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" points={points} />
          {chartData.map((d, i) => (
            <circle key={i} cx={(i / (chartData.length - 1)) * (width - padding * 2) + padding} cy={height - ((d[1] / max) * (height / 2) + (height / 2))} r="5" fill="#4338ca" />
          ))}
        </svg>
      </div>
    </div>
  );
};

export const WeeklyBarChart = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const total = expenses.filter(e => {
        const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return eDate.toDateString() === d.toDateString();
      }).reduce((sum, e) => sum + Math.max(0, Number(e.amount)), 0);
      result.push({ day: dayName, total });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...days.map(d => d.total), 1);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6 font-bold text-slate-800 text-xs uppercase tracking-widest">
        <BarChart3 size={16} className="text-indigo-500" /> Weekly Activity
      </div>
      <div className="flex items-end justify-between h-32 gap-2">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className="w-full bg-slate-50 rounded-t-lg h-full flex items-end overflow-hidden">
              <div 
                className="w-full bg-indigo-500 transition-all duration-700" 
                style={{ height: `${(d.total / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-[10px] mt-2 text-slate-400 font-bold uppercase">{d.day.charAt(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Tag, Wallet, ArrowDownCircle, PieChart, Layers } from 'lucide-react';

/**
 * UTILS
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const SummaryCards = ({ expenses }) => {
  const stats = useMemo(() => {
    const total = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const spent = expenses
      .filter(e => Number(e.amount) < 0)
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    return { net: total, spent };
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <ArrowDownCircle size={24} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Outflow</p>
          <p className="text-xl font-black text-slate-900">{formatCurrency(stats.spent)}</p>
        </div>
      </div>
      <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-4">
        <div className="p-3 bg-white/10 text-white rounded-xl">
          <Wallet size={24} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Net Balance</p>
          <p className="text-xl font-black text-white">{formatCurrency(stats.net)}</p>
        </div>
      </div>
    </div>
  );
};

export const GroupSubtotals = ({ expenses }) => {
  const groups = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (e.group && e.amount < 0) {
        map[e.group] = (map[e.group] || 0) + Math.abs(Number(e.amount) || 0);
      }
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3); // Top 3 groups
  }, [expenses]);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 font-sans animate-in slide-in-from-right-4">
      <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest">
        <Layers size={14} className="text-indigo-500" /> Event Totals
      </h3>
      <div className="space-y-4">
        {groups.map((g, i) => (
          <div key={i} className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-800">{g.name}</p>
              <p className="text-[10px] text-slate-400 font-medium">Accumulated spending</p>
            </div>
            <span className="text-sm font-black text-slate-900">{formatCurrency(g.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CategoryDistribution = ({ categories, expenses }) => {
  const data = useMemo(() => {
    const totals = categories.map(cat => {
      const categoryExpenses = expenses.filter(e => {
        const match = e.category === cat.id; // Filter only by category ID
        return match;
      });
      const value = categoryExpenses.reduce((acc, curr) => acc + Math.abs(Number(curr.amount) || 0), 0); // Sum absolute values
      return { ...cat, value };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

    const totalVal = totals.reduce((acc, curr) => acc + curr.value, 0);
    return { totals, totalVal };
  }, [categories, expenses]);

  if (data.totalVal === 0) return null;

  let cumulativePercent = 0;
  const donutSegments = data.totals.map(cat => {
    const percent = (cat.value / data.totalVal) * 100;
    const start = cumulativePercent;
    cumulativePercent += percent;
    return { ...cat, start, percent };
  });

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 font-sans">
      <div className="flex items-center gap-2 mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <PieChart size={16} className="text-indigo-500" /> Distribution
      </div>
      
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-6">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {donutSegments.map((s, i) => (
              <circle
                key={i}
                cx="18" cy="18" r="15.915"
                fill="transparent"
                stroke={s.color || '#6366f1'}
                strokeWidth="4"
                strokeDasharray={`${s.percent} ${100 - s.percent}`}
                strokeDashoffset={-s.start}
                className="transition-all duration-1000"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-slate-400 uppercase">Spent</span>
            <span className="text-xs font-black text-slate-800">{formatCurrency(data.totalVal)}</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {data.totals.slice(0, 4).map(cat => (
            <div key={cat.id} className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-600">{cat.label}</span>
              </div>
              <span className="text-slate-900">{Math.round((cat.value / data.totalVal) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CategorySubtotals = ({ categories, expenses }) => {
  const totals = useMemo(() => categories.map(cat => ({
    ...cat,
    total: expenses
      .filter(e => e.category === cat.id && e.amount < 0)
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0)
  })).sort((a, b) => b.total - a.total).slice(0, 6), [categories, expenses]);

  const grandTotal = totals.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
      <h3 className="font-bold text-slate-400 mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest">
        <Tag size={14} className="text-indigo-500" /> Subtotals
      </h3>
      <div className="space-y-5">
        {totals.map(cat => (
          <div key={cat.id} className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-600">{cat.label}</span>
              <span className="text-slate-900">{formatCurrency(cat.total)}</span>
            </div>
            <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700" 
                style={{ 
                  width: `${grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0}%`,
                  backgroundColor: cat.color || '#6366f1'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

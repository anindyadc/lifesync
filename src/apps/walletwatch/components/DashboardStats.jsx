import React, { useMemo, useState } from 'react';
import { Tag, Wallet, ArrowDownCircle, PieChart, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import { NetTrendGraph, WeeklyBarChart } from './OverviewCharts';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const MonthNavigator = ({ selectedMonth, setSelectedMonth }) => {
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100">
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-lg font-bold text-slate-800">
        {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </h2>
      <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

const Dashboard = ({ user, categories }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { expenses, loading } = useExpenses(user, 'default-app-id', selectedMonth);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <MonthNavigator selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      <SummaryCards expenses={expenses} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <WeeklyBarChart expenses={expenses} />
          <NetTrendGraph expenses={expenses} />
        </div>
        <div>
          <GroupSubtotals expenses={expenses} />
          <CategoryDistribution categories={categories} expenses={expenses} />
          <CategorySubtotals categories={categories} expenses={expenses} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

export const SummaryCards = ({ expenses }) => {
  const stats = useMemo(() => {
    const spent = expenses
      .filter(e => Number(e.amount) < 0)
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    
    const lent = expenses
      .filter(e => e.reimbursementStatus === 'pending')
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);
    
    return { net: lent, spent };
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
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Lent Amount</p>
          <p className="text-xl font-black text-white">{formatCurrency(stats.net)}</p>
        </div>
      </div>
    </div>
  );
};

export const GroupSubtotals = ({ expenses }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const groups = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (e.group && e.amount < 0) {
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
      .slice(0, 3); // Top 3 groups
  }, [expenses]);

  if (groups.length === 0) return null;

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 font-sans animate-in slide-in-from-right-4">
        <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <Layers size={14} className="text-indigo-500" /> Event Totals
        </h3>
        <div className="space-y-4">
          {groups.map((g, i) => (
            <div 
              key={i} 
              className="flex justify-between items-center cursor-pointer group"
              onClick={() => setSelectedGroup(g)}
            >
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{g.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">Accumulated spending</p>
              </div>
              <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(g.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Layers size={20} className="text-indigo-600" />
                  {selectedGroup.name}
                </h3>
                <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedGroup.total)} Total</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {selectedGroup.items.length > 0 ? (
                selectedGroup.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {exp.date?.toDate ? exp.date.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-slate-900">{formatCurrency(Math.abs(exp.amount))}</span>
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

export const CategoryDistribution = ({ categories, expenses }) => {
  const data = useMemo(() => {
    const totals = categories.map(cat => {
      const categoryExpenses = expenses.filter(e => {
        const match = e.category === cat.id && e.amount < 0; // Filter only by category ID and ensure it's an expense
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
  const [selectedCat, setSelectedCat] = useState(null);

  const totals = useMemo(() => categories.map(cat => {
    const catExpenses = expenses.filter(e => e.category === cat.id && e.amount < 0);
    return {
      ...cat,
      total: catExpenses.reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0),
      items: catExpenses
    };
  }).sort((a, b) => b.total - a.total).slice(0, 6), [categories, expenses]);

  const grandTotal = totals.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-sans">
        <h3 className="font-bold text-slate-400 mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <Tag size={14} className="text-indigo-500" /> Subtotals
        </h3>
        <div className="space-y-5">
          {totals.map(cat => (
            <div 
              key={cat.id} 
              className="space-y-2 cursor-pointer group"
              onClick={() => setSelectedCat(cat)}
            >
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-slate-600 group-hover:text-indigo-600 transition-colors">{cat.label}</span>
                <span className="text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(cat.total)}</span>
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

      {selectedCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center" style={{ backgroundColor: selectedCat.bg || '#f8fafc' }}>
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedCat.color || '#6366f1' }}></div>
                  {selectedCat.label}
                </h3>
                <p className="text-sm font-bold text-slate-600 mt-1">{formatCurrency(selectedCat.total)} Total</p>
              </div>
              <button onClick={() => setSelectedCat(null)} className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {selectedCat.items.length > 0 ? (
                selectedCat.items.map(exp => (
                  <div key={exp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {exp.date?.toDate ? exp.date.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-slate-900">{formatCurrency(Math.abs(exp.amount))}</span>
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


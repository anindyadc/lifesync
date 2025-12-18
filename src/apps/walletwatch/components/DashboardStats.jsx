import React from 'react';
import { Tag } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export const CategorySubtotals = ({ categories, expenses }) => {
  const totals = categories.map(cat => {
    const sum = expenses
      .filter(e => e.category === cat.id)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { ...cat, total: sum };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = totals.reduce((acc, curr) => acc + (curr.total > 0 ? curr.total : 0), 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
        <Tag size={16} className="text-indigo-500" /> Category Subtotals
      </h3>
      <div className="space-y-4">
        {totals.map(cat => (
          <div key={cat.id} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">{cat.label}</span>
              <span className={cat.total < 0 ? 'text-emerald-600' : 'text-slate-900'}>
                {formatCurrency(cat.total)}
              </span>
            </div>
            {cat.total > 0 && (
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${(cat.total / grandTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

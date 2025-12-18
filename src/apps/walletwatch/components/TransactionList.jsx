import React from 'react';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { DEFAULT_CATEGORIES, PAYMENT_MODES } from '../constants';

const TransactionList = ({ expenses, onEdit, onDelete, onViewAll, limit }) => {
  const displayExpenses = limit ? expenses.slice(0, limit) : expenses;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{limit ? "Recent Transactions" : "All Transactions"}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs text-indigo-600 font-medium hover:underline">
            View All
          </button>
        )}
      </div>
      
      <div className="divide-y divide-slate-100">
        {displayExpenses.map(e => (
          <div key={e.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${DEFAULT_CATEGORIES.find(c => c.id === e.category)?.bg || 'bg-gray-100'}`}>
                <CreditCard size={20} className="opacity-75" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  {DEFAULT_CATEGORIES.find(c => c.id === e.category)?.label || 'Other'}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {e.description || 'No description'} • {formatDate(e.date)}
                </p>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <span className="block font-bold text-slate-900 mb-1">{formatCurrency(e.amount)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-medium mr-1">
                  {PAYMENT_MODES.find(p => p.id === e.paymentMode)?.label}
                </span>
                {/* Actions (visible on hover or focus) */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button onClick={() => onEdit(e)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(e.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {displayExpenses.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No transactions found.</div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;

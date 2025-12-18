import React, { useState, useMemo } from 'react';
import { CreditCard, Trash2, Pencil, RefreshCcw, Folder } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';

/**
 * TransactionList Component
 * Optimized for clear settlement visibility.
 */
const TransactionList = ({ expenses, categories, onEdit, onDelete, onSettle }) => {
  const [groupByEvent, setGroupByEvent] = useState(false);

  const groupedData = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    expenses.forEach(e => {
      if (e.group) {
        if (!groups[e.group]) groups[e.group] = { total: 0, items: [] };
        groups[e.group].items.push(e);
        groups[e.group].total += Number(e.amount);
      } else ungrouped.push(e);
    });
    return { groups, ungrouped };
  }, [expenses]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center px-2">
        <h3 className="font-bold text-slate-800">Transaction History</h3>
        <button 
          onClick={() => setGroupByEvent(!groupByEvent)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${groupByEvent ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm'}`}
        >
          {groupByEvent ? 'View Individual' : 'Group by Event'}
        </button>
      </div>

      {groupByEvent ? (
        Object.entries(groupedData.groups).map(([name, data]) => (
          <div key={name} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm mb-4">
             <div className="p-4 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Folder size={18}/></div>
                 <h4 className="font-bold text-slate-800">{name}</h4>
               </div>
               <span className="font-black text-slate-900">{formatCurrency(data.total)}</span>
             </div>
             <div className="divide-y divide-slate-50">
                {data.items.map(exp => (
                  <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
                ))}
             </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-50">
            {expenses.map(exp => (
              <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * TransactionRow
 * Settlement button (RefreshCcw) is now always visible for 'pending' items 
 * to ensure users can find it immediately.
 */
const TransactionRow = ({ exp, categories, onEdit, onDelete, onSettle }) => (
  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categories.find(c=>c.id===exp.category)?.bg || 'bg-slate-100'}`}>
        <CreditCard size={18} className="opacity-70" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{exp.description}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {formatDate(exp.date)} • {categories.find(c=>c.id===exp.category)?.label || exp.category}
        </p>
      </div>
    </div>
    <div className="text-right flex items-center gap-4">
      <div className="flex flex-col items-end">
        <span className={`font-black text-sm ${exp.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(exp.amount)}</span>
        {exp.reimbursementStatus === 'pending' && (
          <span className="text-[8px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1 animate-pulse">Lent</span>
        )}
        {exp.reimbursementStatus === 'settled' && (
          <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter mt-1">Settled</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {exp.reimbursementStatus === 'pending' && (
          <button 
            onClick={() => onSettle(exp)} 
            className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 shadow-sm transition-all active:scale-90" 
            title="Settle / Refund"
          >
            <RefreshCcw size={16}/>
          </button>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(exp)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={14}/></button>
          <button onClick={() => onDelete(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  </div>
);

export default TransactionList;

import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, Trash2, Pencil, RefreshCcw, Folder, MoreVertical, ChevronDown, Tag, Filter } from 'lucide-react';
import { formatCurrency, formatDate, getTagColor } from '../../../lib/utils';

/**
 * TransactionList Component
 * Optimized for clear settlement visibility.
 */
const TransactionList = ({ expenses, categories, onEdit, onDelete, onSettle }) => {
  const [grouping, setGrouping] = useState('month'); // 'none', 'month', 'event'
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [expandedTransactionGroups, setExpandedTransactionGroups] = useState({});
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const availableTags = useMemo(() => {
    const tagsSet = new Set();
    expenses.forEach(exp => {
      if (exp.tags && Array.isArray(exp.tags)) {
        exp.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (filterCategory && exp.category !== filterCategory) return false;
      if (filterTag && (!exp.tags || !exp.tags.includes(filterTag))) return false;
      return true;
    });
  }, [expenses, filterCategory, filterTag]);

  const groupedData = useMemo(() => {
    if (grouping === 'month') {
      const monthlyGroups = {};
      filteredExpenses.forEach(expense => {
        const date = expense.date.toDate();
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!monthlyGroups[monthYear]) {
          monthlyGroups[monthYear] = [];
        }
        monthlyGroups[monthYear].push(expense);
      });
      return { monthlyGroups };
    }
    
    if (grouping === 'event') {
      const eventGroups = {};
      const ungrouped = [];
      filteredExpenses.forEach(e => {
        if (e.group) {
          if (!eventGroups[e.group]) eventGroups[e.group] = { total: 0, items: [] };
          eventGroups[e.group].items.push(e);
          eventGroups[e.group].total += Number(e.amount);
        } else {
          ungrouped.push(e);
        }
      });
      return { eventGroups, ungrouped };
    }

    return {};
  }, [filteredExpenses, grouping]);

  useEffect(() => {
    setShowAll(false);
    setShowAllGroups(false);
    setExpandedTransactionGroups({});
    
    const groupKeys = Object.keys(groupedData.monthlyGroups || groupedData.eventGroups || {});
    const firstGroup = groupKeys[0];
    const initialCollapsedState = {};
    groupKeys.forEach(key => {
      initialCollapsedState[key] = key !== firstGroup;
    });
    setCollapsedGroups(initialCollapsedState);
  }, [grouping, filteredExpenses, groupedData]);

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleTransactionGroup = (groupKey) => {
    setExpandedTransactionGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const renderGroupedByMonth = () => {
    const monthEntries = Object.entries(groupedData.monthlyGroups);
    const groupsToShow = showAllGroups ? monthEntries : monthEntries.slice(0, 3);
    return (
      <div className="space-y-2">
        {groupsToShow.map(([monthYear, monthExpenses]) => {
          const isTransactionListExpanded = !!expandedTransactionGroups[monthYear];
          const transactionsToShow = isTransactionListExpanded ? monthExpenses : monthExpenses.slice(0, 5);
          
          return (
            <div key={monthYear} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
              <button 
                onClick={() => toggleGroup(monthYear)}
                className="p-4 w-full flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50"
              >
                <h4 className="font-bold text-slate-800">{monthYear}</h4>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900">
                    {formatCurrency(monthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0))}
                  </span>
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[monthYear] && 'rotate-180'}`} />
                </div>
              </button>
              {!collapsedGroups[monthYear] && (
                <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
                  {transactionsToShow.map(exp => (
                    <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
                  ))}
                  {monthExpenses.length > 5 && (
                    <div className="p-2 text-center">
                      <button 
                        onClick={() => toggleTransactionGroup(monthYear)}
                        className="text-indigo-600 font-bold text-xs hover:underline"
                      >
                        {isTransactionListExpanded ? 'Show Less' : `Show ${monthExpenses.length - 5} More`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {monthEntries.length > 3 && (
          <div className="p-4 text-center">
            <button 
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="text-indigo-600 font-bold text-xs hover:underline"
            >
              {showAllGroups ? 'Show Less' : `Show ${monthEntries.length - 3} More Months`}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGroupedByEvent = () => {
    const eventEntries = Object.entries(groupedData.eventGroups);
    const groupsToShow = showAllGroups ? eventEntries : eventEntries.slice(0, 3);
    return (
      <div className="space-y-2">
        {groupsToShow.map(([name, data]) => {
          const isTransactionListExpanded = !!expandedTransactionGroups[name];
          const transactionsToShow = isTransactionListExpanded ? data.items : data.items.slice(0, 5);

          return (
            <div key={name} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
              <button 
                onClick={() => toggleGroup(name)}
                className="p-4 w-full flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50"
              >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Folder size={18}/></div>
                   <h4 className="font-bold text-slate-800">{name}</h4>
                 </div>
                 <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900">{formatCurrency(data.total)}</span>
                  <ChevronDown size={18} className={`text-slate-500 transition-transform ${!collapsedGroups[name] && 'rotate-180'}`} />
                </div>
              </button>
               {!collapsedGroups[name] && (
                <div className="divide-y divide-slate-50 animate-in fade-in duration-200">
                    {transactionsToShow.map(exp => (
                      <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
                    ))}
                    {data.items.length > 5 && (
                      <div className="p-2 text-center">
                        <button 
                          onClick={() => toggleTransactionGroup(name)}
                          className="text-indigo-600 font-bold text-xs hover:underline"
                        >
                          {isTransactionListExpanded ? 'Show Less' : `Show ${data.items.length - 5} More`}
                        </button>
                      </div>
                    )}
                </div>
               )}
            </div>
          );
        })}
        {eventEntries.length > 3 && (
          <div className="p-4 text-center">
            <button 
              onClick={() => setShowAllGroups(!showAllGroups)}
              className="text-indigo-600 font-bold text-xs hover:underline"
            >
              {showAllGroups ? 'Show Less' : `Show ${eventEntries.length - 3} More Events`}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderIndividual = () => {
    const transactionsToShow = showAll ? filteredExpenses : filteredExpenses.slice(0, 10);
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-50">
          {transactionsToShow.map(exp => (
            <TransactionRow key={exp.id} exp={exp} categories={categories} onEdit={onEdit} onDelete={onDelete} onSettle={onSettle} />
          ))}
        </div>
        {filteredExpenses.length > 10 && (
          <div className="p-4 text-center">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="text-indigo-600 font-bold text-xs hover:underline"
            >
              {showAll ? 'Show Less' : `Show ${filteredExpenses.length - 10} More`}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center px-2 gap-4">
        <h3 className="font-bold text-slate-800">Transaction History</h3>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-400 ml-2" />
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1.5 bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer max-w-[120px] truncate"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            
            {availableTags.length > 0 && (
              <>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <select 
                  value={filterTag} 
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-2 py-1.5 bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer max-w-[100px] truncate"
                >
                  <option value="">All Tags</option>
                  {availableTags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

          {/* Grouping */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setGrouping('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              By Month
            </button>
            <button 
              onClick={() => setGrouping('event')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'event' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              By Event
            </button>
            <button 
              onClick={() => setGrouping('none')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${grouping === 'none' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 shadow-sm hover:bg-slate-50'}`}
            >
              Individual
            </button>
          </div>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No transactions match your filters</h4>
          <p className="text-sm text-slate-500 mt-2">Try changing or clearing the category and tag filters above.</p>
        </div>
      ) : (
        <>
          {grouping === 'month' && renderGroupedByMonth()}
          {grouping === 'event' && renderGroupedByEvent()}
          {grouping === 'none' && renderIndividual()}
        </>
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
  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categories.find(c=>c.id===exp.category)?.bg || 'bg-slate-100'}`}>
        <CreditCard size={18} className="opacity-70" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{exp.description}</h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          {formatDate(exp.date)} • {categories.find(c=>c.id===exp.category)?.label || exp.category}
        </p>
        {exp.tags && exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {exp.tags.map(tag => {
              const colors = getTagColor(tag);
              return (
                <span key={tag} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} border-opacity-50`}>
                  <Tag size={8} /> {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <div className="text-right flex items-center gap-4 mt-4 sm:mt-0">
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
        <div className="relative sm:hidden">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <MoreVertical size={16}/>
          </button>
        </div>
        <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(exp)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={14}/></button>
          <button onClick={() => onDelete(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  </div>
);

export default TransactionList;

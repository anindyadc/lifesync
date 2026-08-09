import React, { useState, useMemo } from 'react';
import { Plus, X, Check, AlertTriangle, Sun, Sunrise, ChevronDown, ListChecks } from 'lucide-react';
import { toISODate } from '../../../lib/utils';

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const Row = ({ item, onToggle, onDelete }) => (
  <div className="flex items-center gap-3 py-2 px-4 hover:bg-slate-50 transition-colors group">
    <button
      type="button"
      onClick={() => onToggle(item.id, !item.completed)}
      className={`w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
        item.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400'
      }`}
      aria-label={item.completed ? 'Mark not done' : 'Mark done'}
    >
      <Check size={13} className={item.completed ? 'opacity-100' : 'opacity-0'} />
    </button>
    <span className={`flex-1 text-sm truncate ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
      {item.title}
    </span>
    <button
      type="button"
      onClick={() => { if (window.confirm(`Delete "${item.title}"?`)) onDelete(item.id); }}
      aria-label="Delete"
      className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
    >
      <X size={14} />
    </button>
  </div>
);

const Section = ({ label, icon: Icon, items, tone = 'slate', emptyText, onToggle, onDelete }) => (
  <div>
    <div className={`flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide ${
      tone === 'red' ? 'text-red-500' : 'text-slate-400'
    }`}>
      {Icon && <Icon size={13} />}
      {label} <span className="font-normal normal-case text-slate-300">({items.length})</span>
    </div>
    {items.length > 0 ? (
      <div className="divide-y divide-slate-50">
        {items.map(item => <Row key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />)}
      </div>
    ) : (
      <p className="px-4 pb-3 text-xs text-slate-300 italic">{emptyText}</p>
    )}
  </div>
);

const QuickList = ({ quickTasks = [], onAdd, onToggle, onDelete }) => {
  const [title, setTitle] = useState('');
  const [bucket, setBucket] = useState('today');
  const [showCompleted, setShowCompleted] = useState(false);

  const todayISO = toISODate(new Date());
  const tomorrowISO = toISODate(addDays(new Date(), 1));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, forDate: bucket === 'today' ? todayISO : tomorrowISO });
    setTitle('');
  };

  const { overdue, today, tomorrow, completed } = useMemo(() => {
    const pending = quickTasks.filter(t => !t.completed);
    return {
      overdue: pending.filter(t => t.forDate < todayISO),
      today: pending.filter(t => t.forDate === todayISO),
      tomorrow: pending.filter(t => t.forDate === tomorrowISO || t.forDate > tomorrowISO),
      completed: quickTasks.filter(t => t.completed)
    };
  }, [quickTasks, todayISO, tomorrowISO]);

  const isEmpty = quickTasks.length === 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <span className="font-bold text-slate-800">Quick List</span>
        <p className="text-xs text-slate-400 mt-0.5">Fast entries for today/tomorrow — no subtasks, no fuss.</p>

        <form onSubmit={handleAdd} className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need to do?"
            className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none text-sm font-medium transition-all"
          />
          <div className="flex gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {[{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBucket(opt.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    bucket === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </form>
      </div>

      {isEmpty ? (
        <div className="text-center py-10 text-slate-400">
          <ListChecks size={24} className="mx-auto mb-2 text-slate-300" />
          Nothing here yet — add something above.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {overdue.length > 0 && (
            <Section label="Overdue" icon={AlertTriangle} items={overdue} tone="red" onToggle={onToggle} onDelete={onDelete} />
          )}
          <Section label="Today" icon={Sun} items={today} emptyText="Nothing planned for today." onToggle={onToggle} onDelete={onDelete} />
          <Section label="Tomorrow" icon={Sunrise} items={tomorrow} emptyText="Nothing planned for tomorrow." onToggle={onToggle} onDelete={onDelete} />

          {completed.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide hover:bg-slate-50 transition-colors"
              >
                <span>Completed ({completed.length})</span>
                <ChevronDown size={14} className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
              </button>
              {showCompleted && (
                <div className="divide-y divide-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {completed.map(item => <Row key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickList;

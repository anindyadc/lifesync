import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Tag, Calendar, Timer, Check, ChevronDown, ChevronRight, AlertTriangle, Search, ArrowUpDown, XCircle, CheckSquare, ListChecks } from 'lucide-react';
import { formatDuration, safeGetDate } from '../../../lib/utils';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../constants';

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

const TaskList = ({ tasks, categories = [], onEdit, onDelete, onStatusChange, onToggleSubtask, onBulkComplete, onBulkDelete, filterStatus, setFilterStatus }) => {
  const [expandedTask, setExpandedTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('created-desc');
  const [selectedIds, setSelectedIds] = useState([]);

  const getPriorityColor = (p) => {
    switch(p) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50';
    }
  };
  const toggleExpand = (id) => setExpandedTask(expandedTask === id ? null : id);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (query) {
        const haystack = [t.title, t.description, t.category].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterCategory, search]);

  const sortedTasks = useMemo(() => {
    if (sortBy === 'created-desc') return filteredTasks; // already newest-first from useTasks
    const arr = [...filteredTasks];
    arr.sort((a, b) => {
      if (sortBy === 'priority-desc') return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
      const dateA = a.dueDate ? safeGetDate(a.dueDate) : null;
      const dateB = b.dueDate ? safeGetDate(b.dueDate) : null;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // tasks without a due date sort last either direction
      if (!dateB) return -1;
      return sortBy === 'due-asc' ? dateA - dateB : dateB - dateA;
    });
    return arr;
  }, [filteredTasks, sortBy]);

  const hasActiveFilters = !!(search.trim() || filterPriority || filterCategory || filterStatus !== 'all');
  const clearAllFilters = () => {
    setSearch('');
    setFilterPriority('');
    setFilterCategory('');
    setFilterStatus('all');
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };
  const clearSelection = () => setSelectedIds([]);

  const handleBulkComplete = () => {
    onBulkComplete(selectedIds);
    clearSelection();
  };
  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} task${selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
      onBulkDelete(selectedIds);
      clearSelection();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-slate-800">Task List</span>
            <span className="text-[11px] font-semibold text-slate-400">Showing {sortedTasks.length} of {tasks.length}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, category..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {['all', 'todo', 'done'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-2 py-1 rounded-lg capitalize font-semibold transition-colors ${filterStatus === s ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
            >
              <option value="created-desc">Newest first</option>
              <option value="due-asc">Due date: Soonest</option>
              <option value="due-desc">Due date: Latest</option>
              <option value="priority-desc">Priority: High to Low</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              title="Clear all filters"
            >
              <XCircle size={14} /> Clear
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <span className="text-xs font-bold text-indigo-700">{selectedIds.length} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkComplete} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                <CheckSquare size={13} /> Mark Done
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={clearSelection} className="text-xs font-semibold text-indigo-400 hover:text-indigo-600 px-1">Clear</button>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {sortedTasks.map(task => {
          const subCompleted = task.subtasks?.filter(s => s.completed).length || 0;
          const subTotal = task.subtasks?.length || 0;
          const progress = subTotal > 0 ? (subCompleted / subTotal) * 100 : (task.progress ?? 0);

          const taskTimeSpent = (task.timeLogs || []).reduce((acc, log) => acc + (log.minutes || 0), 0);
          const subtaskTimeSpent = (task.subtasks || []).reduce((acc, s) => acc + (s.timeLogs || []).reduce((sAcc, log) => sAcc + (log.minutes || 0), 0), 0);
          const timeSpent = taskTimeSpent + subtaskTimeSpent;

          const dueDateObj = task.dueDate ? safeGetDate(task.dueDate) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isOverdue = task.status !== 'done' && dueDateObj && dueDateObj < today;

          const category = categories.find(c => c.id === task.category);
          const CategoryIcon = CATEGORY_ICONS[task.category] || DEFAULT_CATEGORY_ICON;
          const isSelected = selectedIds.includes(task.id);

          return (
            <div key={task.id}>
              <div className={`p-4 flex flex-col sm:flex-row justify-between items-start hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                <div className="flex gap-3 flex-1 min-w-0">
                   <input
                     type="checkbox"
                     checked={isSelected}
                     onChange={() => toggleSelected(task.id)}
                     aria-label={`Select ${task.title}`}
                     className="mt-1.5 w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 shrink-0"
                   />
                   <button
                     onClick={() => onStatusChange(task.id, task.status)}
                     className={`mt-1 w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                   >
                     <Check size={14} className={task.status === 'done' ? 'opacity-100' : 'opacity-0'} />
                   </button>

                   <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-slate-800 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                      {task.description && <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>}

                      <div className="mt-2 w-full max-w-xs">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span><span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${category?.bg || 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                          <CategoryIcon size={12}/> {category?.label || task.category}
                        </span>
                        {task.dueDate && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${isOverdue ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                            <Calendar size={12}/> {task.dueDate}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border text-red-600 bg-red-50 border-red-200 font-semibold">
                            <AlertTriangle size={12}/> Overdue
                          </span>
                        )}
                        {timeSpent > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-1 font-medium border border-emerald-100">
                            <Timer size={10}/> {formatDuration(timeSpent)}
                          </span>
                        )}
                      </div>
                   </div>
                </div>

                <div className="flex gap-1 items-center mt-4 sm:mt-0 sm:pl-4">
                  {subTotal > 0 && (
                    <button onClick={() => toggleExpand(task.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
                      {expandedTask === task.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                  )}
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(task)} aria-label="Edit task" title="Edit" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                    <button onClick={() => onDelete(task.id)} aria-label="Delete task" title="Delete" className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>

              {expandedTask === task.id && (
                <div className="pl-12 pr-6 pb-4 animate-in fade-in">
                  <div className="space-y-1">
                    {task.subtasks.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onToggleSubtask(task.id, s.id)}
                        className="flex items-center gap-3 w-full text-left py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${s.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          <Check size={11} className={`text-white transition-opacity ${s.completed ? 'opacity-100' : 'opacity-0'}`} />
                        </span>
                        <span className={`text-sm ${s.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {sortedTasks.length === 0 && tasks.length > 0 && (
          <div className="text-center py-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl m-4">
            <Search size={24} className="mx-auto mb-2 text-slate-300" />
            No tasks match your filters.
          </div>
        )}
        {tasks.length === 0 && (
          <div className="text-center py-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl m-4">
            <ListChecks size={24} className="mx-auto mb-2 text-slate-300" />
            No tasks yet — tap "New Task" above to add one.
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;

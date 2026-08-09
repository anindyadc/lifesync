import React, { useState, useMemo } from 'react';
import {
  Plus, Download, FileText, Loader2, X, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
import { safeGetDate } from '../../lib/utils';
import { getTaskType } from './constants';
import ConfirmModal from '../../components/ConfirmModal';

// Custom Hooks
import { useTasks, getTaskMinutes } from './hooks/useTasks';
import { useQuickTasks } from './hooks/useQuickTasks';
import { useTaskExport } from './hooks/useTaskExport';

// Local Components
import DashboardStats from './components/DashboardStats';
import PriorityChart from './components/PriorityChart';
import CategoryChart from './components/CategoryChart';
import TaskReportTable from './components/TaskReportTable';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TimeReport from './components/TimeReport';
import QuickList from './components/QuickList';

// Pure, reusable so the Dashboard's current month and its month-over-month delta can
// both be computed the same way without duplicating the filtering logic.
//
// Returns each in-scope task with its FULL, unmodified `subtasks` (so progress/counts
// stay correct even for a subtask with no time logged this month — this used to strip
// out any subtask without a monthly log, undercounting the Subtasks KPI and the Report
// table's progress column) plus a separate `monthlySubtasks` — the same subtasks but
// trimmed to only their monthly time logs — for callers that need a *time* total for
// the month specifically (pass `{ timeLogs: task.timeLogs, subtasks: task.monthlySubtasks }`
// into getTaskMinutes rather than the task itself).
const getTasksForMonth = (tasks, date) => {
  const month = date.getMonth();
  const year = date.getFullYear();

  return tasks
    .map(task => {
      const monthlyTaskTimeLogs = (task.timeLogs || []).filter(log => {
        const logDate = safeGetDate(log.date);
        return logDate && logDate.getMonth() === month && logDate.getFullYear() === year;
      });

      const monthlySubtasks = (task.subtasks || [])
        .map(subtask => {
          const monthlySubtaskTimeLogs = (subtask.timeLogs || []).filter(log => {
            const logDate = safeGetDate(log.date);
            return logDate && logDate.getMonth() === month && logDate.getFullYear() === year;
          });

          if (monthlySubtaskTimeLogs.length > 0) {
            return { ...subtask, timeLogs: monthlySubtaskTimeLogs };
          }
          return null;
        })
        .filter(Boolean);

      const taskDate = safeGetDate(task.dueDate);
      const isTaskDateInMonth = taskDate && taskDate.getMonth() === month && taskDate.getFullYear() === year;

      if (isTaskDateInMonth || monthlyTaskTimeLogs.length > 0 || monthlySubtasks.length > 0) {
        return {
          ...task,
          timeLogs: monthlyTaskTimeLogs,
          subtasks: task.subtasks || [],
          monthlySubtasks,
        };
      }

      return null;
    })
    .filter(Boolean);
};

const getCompletionRate = (monthTasks) =>
  monthTasks.length > 0 ? Math.round((monthTasks.filter(t => t.status === 'done').length / monthTasks.length) * 100) : 0;

// Dashboard scope: 'all' | 'personal' | `office:${officeId}` (any official task, or one
// scoped to a specific office) — lets the Dashboard be viewed as a whole or split out by
// Personal/Official-per-office without duplicating the KPI/chart/report-table wiring.
const filterByScope = (tasks, scope) => {
  if (scope === 'all') return tasks;
  if (scope === 'personal') return tasks.filter(t => getTaskType(t) === 'personal');
  if (scope === 'official') return tasks.filter(t => getTaskType(t) === 'official');
  if (scope.startsWith('office:')) {
    const officeId = scope.slice('office:'.length);
    return tasks.filter(t => getTaskType(t) === 'official' && t.office === officeId);
  }
  return tasks;
};

const TaskFlowApp = ({ user }) => {
  // 1. Initialize Hooks
  const {
    tasks, categories, offices, loading,
    addTask, updateTask, deleteTask,
    addCategory, removeCategory, addOffice, removeOffice
  } = useTasks(user);
  const { quickTasks, addQuickTask, toggleQuickTask, deleteQuickTask } = useQuickTasks(user);
  const { exportToCSV, exportToPDF, exporting } = useTaskExport(tasks);

  // 2. Local State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dashboardDate, setDashboardDate] = useState(new Date());
  const [dashboardScope, setDashboardScope] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const handleDateChange = (range) => {
    setDateRange(range);
  };

  const handleMonthChange = (increment) => {
    setDashboardDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  const filteredTasks = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return tasks;

    const logInRange = (log) => {
      const logDate = safeGetDate(log.date);
      return logDate && logDate >= dateRange.from && logDate <= dateRange.to;
    };

    return tasks.filter(task => {
      const taskDate = safeGetDate(task.dueDate);
      const taskInRange = taskDate && taskDate >= dateRange.from && taskDate <= dateRange.to;

      // Time logged directly on the task (not a subtask) used to be invisible here —
      // a task with no due date in range and no subtask activity, but with its own
      // logged time in range, silently never reached the Report tab or its export.
      const taskTimeInRange = task.timeLogs?.some(logInRange);

      const subtaskInRange = task.subtasks?.some(subtask =>
        subtask.timeLogs?.some(logInRange)
      );

      return taskInRange || taskTimeInRange || subtaskInRange;
    });
  }, [tasks, dateRange]);

  const memoizedEditingTask = useMemo(() => editingTask, [editingTask]);

  // 3. Derived Stats for Dashboard (Current Month, within the selected scope)
  const dashboardScopedTasks = useMemo(() => filterByScope(tasks, dashboardScope), [tasks, dashboardScope]);
  const currentMonthTasks = useMemo(() => getTasksForMonth(dashboardScopedTasks, dashboardDate), [dashboardScopedTasks, dashboardDate]);

  // The header export used to always export the full unfiltered `tasks`, so a PDF taken
  // while viewing "Personal, March" on the Dashboard silently included every task ever
  // created. My Tasks has no page-level scope known here (its filters live in TaskList's
  // own state), so it still exports everything shown-or-not, same as before.
  const tasksForExport = activeTab === 'report' ? filteredTasks : activeTab === 'dashboard' ? currentMonthTasks : tasks;

  const previousCompletionRate = useMemo(() => {
    const prevDate = new Date(dashboardDate.getFullYear(), dashboardDate.getMonth() - 1, 1);
    const prevMonthTasks = getTasksForMonth(dashboardScopedTasks, prevDate);
    return prevMonthTasks.length > 0 ? getCompletionRate(prevMonthTasks) : null;
  }, [dashboardScopedTasks, dashboardDate]);

  const totalTimeSpent = useMemo(() => {
    // `task.subtasks` is now the FULL list (see getTasksForMonth) — the month-scoped
    // time total has to come from `monthlySubtasks` instead, or this would silently sum
    // every subtask's all-time logged minutes rather than just this month's.
    return currentMonthTasks.reduce((total, task) =>
      total + getTaskMinutes({ timeLogs: task.timeLogs, subtasks: task.monthlySubtasks }), 0);
  }, [currentMonthTasks]);

  const stats = useMemo(() => ({
    total: currentMonthTasks.length,
    completed: currentMonthTasks.filter(t => t.status === 'done').length,
    completionRate: getCompletionRate(currentMonthTasks),
    time: totalTimeSpent,
    totalSubtasks: currentMonthTasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0),
    completedSubtasks: currentMonthTasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0)
  }), [currentMonthTasks, totalTimeSpent]);

  const priorityData = useMemo(() => {
    const high = currentMonthTasks.filter(t => t.priority === 'high').length;
    const medium = currentMonthTasks.filter(t => t.priority === 'medium').length;
    const low = currentMonthTasks.filter(t => t.priority === 'low').length;
    return [
      { name: 'High', value: high, color: '#ef4444' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Low', value: low, color: '#10b981' }
    ];
  }, [currentMonthTasks]);

  // 4. Interaction Handlers
  const handleSave = async (data) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask(data);
    }
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete task?")) {
      await deleteTask(id);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await updateTask(id, { status: newStatus });
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks || []).map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    await updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleBulkComplete = async (ids) => {
    await Promise.all(ids.map(id => updateTask(id, { status: 'done' })));
  };

  const handleBulkDelete = async (ids) => {
    await Promise.all(ids.map(id => deleteTask(id)));
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName);
      setNewCatName('');
    }
  };

  const handleAddOffice = () => {
    if (newOfficeName.trim()) {
      addOffice(newOfficeName);
      setNewOfficeName('');
    }
  };

  // Removing a category/office used to happen with no confirmation and no warning that
  // tasks still referencing it would fall back to a raw id/OTHER_SLOT and drop out of
  // the filter dropdowns — only full-text search could find them again afterward.
  const [removeTarget, setRemoveTarget] = useState(null); // { isCat, id, label }
  const removeUsageCount = removeTarget
    ? tasks.filter(t => removeTarget.isCat ? t.category === removeTarget.id : t.office === removeTarget.id).length
    : 0;
  const confirmRemoveTarget = async () => {
    if (!removeTarget) return;
    if (removeTarget.isCat) await removeCategory(removeTarget.id);
    else await removeOffice(removeTarget.id);
    setRemoveTarget(null);
  };

  // 5. Render
  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-slate-100 p-2 rounded-xl gap-2">
        <div className="flex space-x-1">
          {['dashboard', 'tasks', 'quicklist', 'report'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'tasks' ? 'My Tasks' : tab === 'quicklist' ? 'Quick List' : tab}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pr-2">
          {activeTab !== 'quicklist' && (
            <>
              <button onClick={() => exportToCSV(tasksForExport)} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600" title="Export CSV"><FileText size={16}/></button>
              <button onClick={() => exportToPDF(activeTab, tasksForExport)} disabled={exporting} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600 disabled:opacity-50" title="Export PDF">
                {exporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
              </button>
            </>
          )}
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600" title="Manage Categories & Offices"><Settings size={16}/></button>
          <button onClick={handleCreateNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"><Plus size={16}/> New Task</button>
        </div>
      </div>

      {/* Content */}
      <div id={`taskflow-${activeTab}`}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-wrap justify-between items-center bg-slate-50 p-4 rounded-xl gap-3">
              <h3 className="font-bold text-lg text-slate-700">
                Dashboard for: {dashboardDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-lg bg-white shadow-sm hover:bg-slate-100"><ChevronLeft size={16}/></button>
                <button onClick={() => handleMonthChange(1)} className="p-2 rounded-lg bg-white shadow-sm hover:bg-slate-100"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-4 -mt-3 pb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">View:</span>
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'personal', label: 'Personal' },
                { id: 'official', label: 'Official (All Offices)' },
                ...offices.map(o => ({ id: `office:${o.id}`, label: o.label })),
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDashboardScope(opt.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${dashboardScope === opt.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="space-y-6 bg-slate-50 p-2 rounded-xl">
              <DashboardStats stats={stats} previousCompletionRate={previousCompletionRate} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <PriorityChart priorityData={priorityData} />
                  <CategoryChart tasks={currentMonthTasks} categories={categories} />
                </div>
                <div className="lg:col-span-2">
                  <TaskReportTable tasks={currentMonthTasks} offices={offices} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TaskList
              tasks={tasks}
              categories={categories}
              offices={offices}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              onBulkComplete={handleBulkComplete}
              onBulkDelete={handleBulkDelete}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          </div>
        )}

        {activeTab === 'quicklist' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <QuickList
              quickTasks={quickTasks}
              onAdd={addQuickTask}
              onToggle={toggleQuickTask}
              onDelete={deleteQuickTask}
            />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TimeReport
              tasks={filteredTasks}
              offices={offices}
              dateRange={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!removeTarget}
        title={`Delete ${removeTarget?.isCat ? 'Category' : 'Office'}`}
        message={removeUsageCount > 0
          ? `${removeUsageCount} existing task${removeUsageCount !== 1 ? 's' : ''} still use "${removeTarget?.label}" — they'll fall back to a raw id and drop out of the filter dropdowns until re-assigned. Remove it anyway?`
          : `Permanently remove "${removeTarget?.label}" from your list?`}
        onConfirm={confirmRemoveTarget}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <TaskForm
            initialData={memoizedEditingTask}
            categories={categories}
            offices={offices}
            onSubmit={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      )}

      {/* Manage Categories & Offices */}
      {isSettingsOpen && (() => {
        const isCat = settingsTab === 'categories';
        const list = isCat ? categories : offices;
        const newName = isCat ? newCatName : newOfficeName;
        const setNewName = isCat ? setNewCatName : setNewOfficeName;
        const handleAdd = isCat ? handleAddCategory : handleAddOffice;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Manage Categories &amp; Offices</h3>
                <button onClick={() => setIsSettingsOpen(false)} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20}/>
                </button>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
                {['categories', 'offices'].map(t => (
                  <button
                    key={t}
                    onClick={() => setSettingsTab(t)}
                    className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-lg transition-colors ${settingsTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-400 font-medium mb-3">
                {list.length} {settingsTab} &middot; tap &times; to remove
                {!isCat && <span className="block mt-0.5">Offices apply to Official-type tasks.</span>}
              </p>

              <div className="flex gap-2 mb-5">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={isCat ? 'New category...' : 'New office...'}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium min-w-0"
                />
                <button onClick={handleAdd} aria-label={isCat ? 'Add category' : 'Add office'} className="shrink-0 p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm active:scale-90 transition-all">
                  <Plus size={18}/>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                {list.map(item => (
                  <div key={item.id} className="group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[110px]">{item.label}</span>
                    <button
                      onClick={() => setRemoveTarget({ isCat, id: item.id, label: item.label })}
                      aria-label={`Remove ${item.label}`}
                      title={`Remove ${item.label}`}
                      className="p-1 text-slate-300 group-hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No {settingsTab} yet.</p>
                )}
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="mt-6 w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TaskFlowApp;

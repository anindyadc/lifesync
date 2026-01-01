import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Plus, Download, FileText, Loader2, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

// Custom Hooks
import { useTasks } from './hooks/useTasks';
import { useTaskExport } from './hooks/useTaskExport';

// Local Components
import DashboardStats from './components/DashboardStats';
import PriorityChart from './components/PriorityChart';
import TaskReportTable from './components/TaskReportTable';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TimeReport from './components/TimeReport';

const TaskFlowApp = ({ user }) => {
  // 1. Initialize Hooks
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks(user);
  const { exportToCSV, exportToPDF, exporting } = useTaskExport(tasks, 'taskflow-dashboard-charts');

  // 2. Local State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dashboardDate, setDashboardDate] = useState(new Date());
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

  const safeGetDate = (date) => {
    if (!date) return null;
    // Firestore timestamp
    if (date.toDate) return date.toDate();
    // String 'YYYY-MM-DD'
    if (typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length === 3) {
        // new Date(year, monthIndex, day) - treats as local time
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    // Fallback
    return new Date(date);
  }

  const filteredTasks = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return tasks;

    return tasks.filter(task => {
      const taskDate = safeGetDate(task.dueDate);
      const taskInRange = taskDate && taskDate >= dateRange.from && taskDate <= dateRange.to;

      const subtaskInRange = task.subtasks?.some(subtask => 
        subtask.timeLogs?.some(log => {
          const logDate = safeGetDate(log.date);
          return logDate && logDate >= dateRange.from && logDate <= dateRange.to;
        })
      );

      return taskInRange || subtaskInRange;
    });
  }, [tasks, dateRange]);

  const memoizedEditingTask = useMemo(() => editingTask, [editingTask]);

  // 3. Derived Stats for Dashboard (Current Month)
  const currentMonthTasks = useMemo(() => {
    const currentMonth = dashboardDate.getMonth();
    const currentYear = dashboardDate.getFullYear();

    return tasks
      .map(task => {
        const monthlyTaskTimeLogs = (task.timeLogs || []).filter(log => {
          const logDate = safeGetDate(log.date);
          return logDate && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });

        const monthlySubtasks = (task.subtasks || [])
          .map(subtask => {
            const monthlySubtaskTimeLogs = (subtask.timeLogs || []).filter(log => {
              const logDate = safeGetDate(log.date);
              return logDate && logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
            });

            if (monthlySubtaskTimeLogs.length > 0) {
              return { ...subtask, timeLogs: monthlySubtaskTimeLogs };
            }
            return null;
          })
          .filter(Boolean);

        const taskDate = safeGetDate(task.dueDate);
        const isTaskDateInMonth = taskDate && taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;

        if (isTaskDateInMonth || monthlyTaskTimeLogs.length > 0 || monthlySubtasks.length > 0) {
          return {
            ...task,
            timeLogs: monthlyTaskTimeLogs,
            subtasks: monthlySubtasks,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [tasks, dashboardDate]);
  
  const totalTimeSpent = useMemo(() => {
    return currentMonthTasks.reduce((total, task) => {
      const taskTime = (task.timeLogs || []).reduce((acc, log) => acc + log.minutes, 0);
      const subtaskTime = (task.subtasks || []).reduce((acc, subtask) => 
        acc + (subtask.timeLogs || []).reduce((sAcc, log) => sAcc + log.minutes, 0), 0);
      return total + taskTime + subtaskTime;
    }, 0);
  }, [currentMonthTasks]);

  const stats = useMemo(() => ({
    total: currentMonthTasks.length,
    completed: currentMonthTasks.filter(t => t.status === 'done').length,
    completionRate: currentMonthTasks.length > 0 ? Math.round((currentMonthTasks.filter(t => t.status === 'done').length / currentMonthTasks.length) * 100) : 0,
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

  // 5. Render
  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-slate-100 p-2 rounded-xl gap-2">
        <div className="flex space-x-1">
          {['dashboard', 'tasks', 'report'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'tasks' ? 'My Tasks' : tab}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pr-2">
          <button onClick={() => exportToCSV(activeTab === 'report' ? filteredTasks : tasks)} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600" title="Export CSV"><FileText size={16}/></button>
          <button onClick={() => exportToPDF(activeTab, activeTab === 'report' ? filteredTasks : tasks)} disabled={exporting} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600 disabled:opacity-50" title="Export PDF">
            {exporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
          </button>
          <button onClick={handleCreateNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"><Plus size={16}/> New Task</button>
        </div>
      </div>

      {/* Content */}
      <div id={`taskflow-${activeTab}`}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
              <h3 className="font-bold text-lg text-slate-700">
                Dashboard for: {dashboardDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-lg bg-white shadow-sm hover:bg-slate-100"><ChevronLeft size={16}/></button>
                <button onClick={() => handleMonthChange(1)} className="p-2 rounded-lg bg-white shadow-sm hover:bg-slate-100"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="space-y-6 bg-slate-50 p-2 rounded-xl">
              <DashboardStats stats={stats} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <PriorityChart priorityData={priorityData} />
                </div>
                <div className="lg:col-span-2">
                  <TaskReportTable tasks={currentMonthTasks} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TaskList
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          </div>
        )}
        
        {activeTab === 'report' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TimeReport 
              tasks={filteredTasks} 
              dateRange={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <TaskForm 
            initialData={memoizedEditingTask} 
            onSubmit={handleSave} 
            onCancel={() => setIsModalOpen(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default TaskFlowApp;
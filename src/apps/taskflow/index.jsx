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

  const filteredTasks = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return tasks;
    return tasks.filter(task => {
      const taskDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      return taskDate >= dateRange.from && taskDate <= dateRange.to;
    });
  }, [tasks, dateRange]);

  const memoizedEditingTask = useMemo(() => editingTask, [editingTask]);

  // 3. Derived Stats for Dashboard (Current Month)
  const currentMonthTasks = useMemo(() => {
    const currentMonth = dashboardDate.getMonth();
    const currentYear = dashboardDate.getFullYear();
    
    return tasks.map(task => {
      const filteredSubtasks = task.subtasks?.filter(subtask => 
        subtask.timeLogs?.some(log => {
          const logDate = new Date(log.date);
          return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        })
      );

      const taskInMonth = (() => {
        const taskDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
        return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
      })();

      if (taskInMonth || (filteredSubtasks && filteredSubtasks.length > 0)) {
        return { ...task, subtasks: filteredSubtasks || [] };
      }
      return null;
    }).filter(Boolean);

  }, [tasks, dashboardDate]);

  const totalTimeSpent = useMemo(() => {
    const currentMonth = dashboardDate.getMonth();
    const currentYear = dashboardDate.getFullYear();

    return tasks.reduce((acc, task) => {
      const taskTime = task.timeLogs?.reduce((tAcc, log) => {
        const logDate = new Date(log.date);
        if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
          return tAcc + log.minutes;
        }
        return tAcc;
      }, 0) || 0;

      const subtaskTime = task.subtasks?.reduce((sAcc, s) => {
        const subtaskLogsTime = s.timeLogs?.reduce((slAcc, log) => {
          const logDate = new Date(log.date);
          if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
            return slAcc + log.minutes;
          }
          return slAcc;
        }, 0) || 0;
        return sAcc + subtaskLogsTime;
      }, 0) || 0;
      
      return acc + taskTime + subtaskTime;
    }, 0);
  }, [tasks, dashboardDate]);

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
import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Plus, Download, FileText, Loader2, X 
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

const TaskFlowApp = ({ user }) => {
  // 1. Initialize Hooks
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks(user);
  const { exportToCSV, exportToPDF, exporting } = useTaskExport(tasks, 'taskflow-dashboard-charts');
  
  // 2. Local State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // 3. Derived Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0,
    time: tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0),
    totalSubtasks: tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0),
    completedSubtasks: tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0)
  }), [tasks]);

  const priorityData = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    return [
      { name: 'High', value: high, color: '#ef4444' }, 
      { name: 'Medium', value: medium, color: '#f59e0b' }, 
      { name: 'Low', value: low, color: '#10b981' }
    ];
  }, [tasks]);

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
      <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl">
        <div className="flex space-x-1">
          {['dashboard', 'tasks'].map(tab => (
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
          <button onClick={exportToCSV} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600" title="Export CSV"><FileText size={16}/></button>
          <button onClick={() => exportToPDF(activeTab)} disabled={exporting} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600 disabled:opacity-50" title="Export PDF">
            {exporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
          </button>
          <button onClick={handleCreateNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"><Plus size={16}/> New Task</button>
        </div>
      </div>

      {/* Content */}
      <>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* ID for PDF capture */}
            <div id="taskflow-dashboard-charts" className="space-y-6 bg-slate-50 p-2 rounded-xl">
              <DashboardStats stats={stats} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <PriorityChart priorityData={priorityData} />
                </div>
                <div className="lg:col-span-2">
                  <TaskReportTable tasks={tasks} />
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
      </>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <TaskForm 
            initialData={editingTask} 
            onSubmit={handleSave} 
            onCancel={() => setIsModalOpen(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default TaskFlowApp;
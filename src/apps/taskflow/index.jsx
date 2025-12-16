import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';
import StatCard from '../../components/StatCard'; // Adjust path as needed

const TaskFlowApp = () => {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Review Q3 financial reports", done: false },
    { id: 2, text: "Update component library", done: true },
    { id: 3, text: "Team sync at 2 PM", done: false },
  ]);
  const [newTask, setNewTask] = useState("");

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, done: false }]);
    setNewTask("");
  };

  const deleteDone = () => {
    setTasks(tasks.filter(t => !t.done));
  };

  const pendingCount = tasks.filter(t => !t.done).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Pending" value={pendingCount} icon={AlertCircle} color="bg-orange-500" />
        <StatCard title="Completed" value={tasks.length - pendingCount} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800">My Tasks</h2>
          <button onClick={deleteDone} className="text-xs text-red-500 hover:text-red-700 font-medium">
            Clear Completed
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={addTask} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2">
            {tasks.map(task => (
              <div 
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer group ${
                  task.done 
                    ? 'bg-slate-50 border-transparent opacity-60' 
                    : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${
                  task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'
                }`}>
                  {task.done && <CheckCircle size={14} className="text-white" />}
                </div>
                <span className={task.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskFlowApp;


import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, TrendingUp, Plus, X, Tag, Calendar, Timer, Edit2, Trash2, ListTodo, AlertCircle, Check, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDuration } from '../../lib/utils';

// ... (StatCard and SimpleDonutChart components remain the same as previous)
const StatCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-slate-400">{subtext}</span>
    </div>
  </div>
);

const SimpleDonutChart = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;
  if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data available</div>;
  
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.map((slice) => {
    const startPercent = cumulativePercent;
    const slicePercent = slice.value / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
    return { path: pathData, color: slice.color };
  });

  return (
    <div className="h-40 relative flex items-center justify-center">
       <svg viewBox="-1 -1 2 2" className="w-32 h-32 -rotate-90 transform">
        {slices.map((slice, i) => <path d={slice.path} fill={slice.color} key={i} />)}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
    </div>
  );
};

const TaskFlowApp = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    title: '', description: '', priority: 'medium', status: 'todo', 
    dueDate: '', category: 'General', subtasks: [], timeSpent: 0 
  });
  const [modalTab, setModalTab] = useState('details');
  const [newSubtask, setNewSubtask] = useState('');
  const [logTimeAmount, setLogTimeAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const APP_ID = 'default-app-id'; // Use default-app-id to match old records

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => { 
        const data = doc.data(); 
        return { id: doc.id, ...data, subtasks: data.subtasks || [], timeSpent: data.timeSpent || 0 }; 
      });
      tasksData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(tasksData);
      setLoadingTasks(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...formData, updatedAt: serverTimestamp() };
    const colRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks');
    
    if (editingId) {
      await updateDoc(doc(colRef, editingId), payload);
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(colRef, payload);
    }
    closeModal();
  };

  const handleDelete = async (id) => { 
    if (window.confirm("Delete task?")) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', id));
    }
  };

  // ... (Keep helper functions: addSubtask, toggleSubtask, etc. same as before)
  const addSubtask = () => { if(newSubtask.trim()){ setFormData({...formData, subtasks: [...formData.subtasks, {id: crypto.randomUUID(), title: newSubtask, completed: false}]}); setNewSubtask(''); }};
  const toggleSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.map(s => s.id === id ? {...s, completed: !s.completed} : s)});
  const removeSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.filter(s => s.id !== id)});
  const openEditModal = (task) => { setFormData({...task, subtasks: task.subtasks || [], timeSpent: task.timeSpent || 0}); setEditingId(task.id); setModalTab('details'); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', category: 'General', subtasks: [], timeSpent: 0}); setModalTab('details'); };

  // Stats Logic (Same as before)
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalTimeSpent = tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0);
    const totalSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
    const completedSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0);
    return { total, completed, completionRate, totalTimeSpent, totalSubtasks, completedSubtasks };
  }, [tasks]);

  const priorityData = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    return [{ name: 'High', value: high, color: '#ef4444' }, { name: 'Medium', value: medium, color: '#f59e0b' }, { name: 'Low', value: low, color: '#10b981' }];
  }, [tasks]);

  const displayedTasks = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const getPriorityColor = (p) => { switch(p) { case 'high': return 'text-red-600 bg-red-50 border-red-200'; case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'; case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200'; default: return 'text-slate-600 bg-slate-50'; } };
  const getStatusColor = (s) => { switch(s) { case 'done': return 'bg-indigo-100 text-indigo-700'; case 'in-progress': return 'bg-blue-100 text-blue-700'; default: return 'bg-slate-100 text-slate-700'; } };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['dashboard', 'tasks'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab === 'tasks' ? 'My Tasks' : tab}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Tasks" value={stats.total} subtext={`${stats.completed} Completed`} icon={CheckSquare} colorClass="bg-blue-100 text-blue-600" />
            <StatCard title="Total Time" value={formatDuration(stats.totalTimeSpent)} subtext="Logged hours" icon={Timer} colorClass="bg-emerald-100 text-emerald-600" />
            <StatCard title="Subtasks" value={`${stats.completedSubtasks}/${stats.totalSubtasks}`} subtext="Progress" icon={ListTodo} colorClass="bg-amber-100 text-amber-600" />
            <StatCard title="Efficiency" value={`${stats.completionRate}%`} subtext="Completion rate" icon={TrendingUp} colorClass="bg-indigo-100 text-indigo-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
              <h3 className="font-bold text-slate-800 mb-6">Task Priority</h3>
              <div className="flex flex-col items-center">
                <SimpleDonutChart data={priorityData} />
                <div className="flex gap-4 mt-6">{priorityData.map((d) => (<div key={d.name} className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>{d.name}</div>))}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h3 className="font-bold text-slate-800">Detailed Report</h3></div>
               <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100"><tr><th className="px-6 py-3">Task</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Progress</th><th className="px-6 py-3">Time</th></tr></thead>
                   <tbody className="divide-y divide-slate-50">
                     {tasks.slice(0, 5).map(task => {
                       const subDone = task.subtasks?.filter(s => s.completed).length || 0; const subTotal = task.subtasks?.length || 0;
                       return (<tr key={task.id} className="hover:bg-slate-50"><td className="px-6 py-3 font-medium text-slate-800">{task.title}</td><td className="px-6 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs capitalize ${getStatusColor(task.status)}`}>{task.status.replace('-', ' ')}</span></td><td className="px-6 py-3"><div className="flex items-center gap-2"><div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full" style={{ width: `${subTotal ? (subDone/subTotal)*100 : 0}%` }}/></div><span className="text-xs">{subDone}/{subTotal}</span></div></td><td className="px-6 py-3 font-mono">{formatDuration(task.timeSpent || 0)}</td></tr>);
                     })}
                     {tasks.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No tasks yet</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <div className="flex justify-between items-center">
              <div className="flex gap-2 overflow-x-auto">{['all', 'todo', 'in-progress', 'done'].map(status => (<button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{status.replace('-', ' ')}</button>))}</div>
              <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex gap-2"><Plus size={16}/> New Task</button>
           </div>
           {loadingTasks ? (<div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>) : (
             <div className="space-y-3">
               {displayedTasks.map(task => {
                 const subCompleted = task.subtasks?.filter(s => s.completed).length || 0; const subTotal = task.subtasks?.length || 0; const progress = subTotal > 0 ? (subCompleted / subTotal) * 100 : 0;
                 return (
                   <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start group hover:shadow-md transition-all">
                      <div className="flex gap-3 w-full">
                         <button onClick={() => updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', task.id), { status: task.status === 'done' ? 'todo' : 'done' })} className={`mt-1 w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center ${task.status === 'done' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}><Check size={14} /></button>
                         <div className="flex-1"><h4 className={`font-semibold text-slate-800 ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>{task.description && <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>}{subTotal > 0 && (<div className="mt-3 w-full max-w-xs"><div className="flex justify-between text-xs text-slate-500 mb-1"><span>Subtasks</span><span>{subCompleted}/{subTotal}</span></div><div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/></div></div>)}<div className="flex flex-wrap gap-2 mt-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>{task.priority}</span><span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded"><Tag size={12}/> {task.category}</span>{task.dueDate && <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded"><Calendar size={12}/> {task.dueDate}</span>}{task.timeSpent > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-1 font-medium"><Timer size={10}/> {formatDuration(task.timeSpent)}</span>}</div></div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4"><button onClick={() => openEditModal(task)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button><button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                   </div>
                 );
               })}
               {displayedTasks.length === 0 && <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">No tasks found.</div>}
             </div>
           )}
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"><h3 className="text-lg font-bold">{editingId ? 'Edit Task' : 'New Task'}</h3><button onClick={closeModal}><X size={20} className="text-slate-400"/></button></div>
              <div className="flex border-b border-slate-100 bg-white shrink-0">{['details', 'subtasks', 'time'].map(tab => (<button key={tab} onClick={() => setModalTab(tab)} className={`flex-1 py-3 text-sm font-medium border-b-2 capitalize ${modalTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab === 'time' ? `Time (${formatDuration(formData.timeSpent)})` : tab === 'subtasks' ? `Subtasks (${formData.subtasks.length})` : tab}</button>))}</div>
              <div className="p-6 overflow-y-auto flex-1">
                 {modalTab === 'details' && (<div className="space-y-4"><input type="text" placeholder="Task Title" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /><textarea rows="3" placeholder="Description" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /><div className="grid grid-cols-2 gap-4"><input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>General</option><option>Work</option><option>Personal</option><option>Shopping</option><option>Health</option></select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Priority</label><div className="flex gap-2">{['low', 'medium', 'high'].map(p => (<button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${formData.priority === p ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-600' : p === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{p}</button>))}</div></div><div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div></div></div>)}
                 {modalTab === 'subtasks' && (<div className="space-y-4"><div className="flex gap-2"><input type="text" placeholder="Add subtask..." className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} /><button type="button" onClick={addSubtask} className="px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg">Add</button></div><div className="space-y-2">{formData.subtasks.map(s => (<div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded group"><button type="button" onClick={() => toggleSubtask(s.id)}><CheckSquare size={16} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/></button><span className={`flex-1 text-sm ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span><button type="button" onClick={() => removeSubtask(s.id)}><X size={14} className="text-slate-400 opacity-0 group-hover:opacity-100"/></button></div>))}</div>{formData.subtasks.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">No subtasks yet</div>}</div>)}
                 {modalTab === 'time' && (<div className="space-y-6"><div className="bg-emerald-50 p-6 rounded-xl text-center"><div className="text-sm text-emerald-600 font-medium mb-1">Total Time Logged</div><div className="text-3xl font-bold text-emerald-700">{formatDuration(formData.timeSpent)}</div></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Log Additional Time (Minutes)</label><div className="flex gap-2"><input type="number" min="1" placeholder="e.g. 30" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={logTimeAmount} onChange={e => setLogTimeAmount(e.target.value)} /><button type="button" onClick={() => { if(logTimeAmount) { setFormData({...formData, timeSpent: (formData.timeSpent||0) + parseInt(logTimeAmount)}); setLogTimeAmount(''); }}} className="px-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium flex items-center gap-2"><Plus size={16}/> Add Log</button></div></div></div>)}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0"><button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button type="button" onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-200">Save</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TaskFlowApp;
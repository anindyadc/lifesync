import React, { useState } from 'react';
import { X, CheckSquare, Plus, Edit2, Check, Clock, Trash2 } from 'lucide-react';
import { formatDuration } from '../../../lib/utils';
import { Form, FormGroup, Label, Input, Textarea, Select, Button } from '../../../components/Form';

const TimeLogModal = ({ onLog, onCancel, subtask }) => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleLog = () => {
    if (time) {
      onLog({ minutes: parseInt(time), date });
    }
  };

  const title = subtask && !subtask.isMainTask ? `Log Time for: ${subtask.title}` : 'Log Time for Task';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        <FormGroup>
          <Label>Minutes</Label>
          <input 
            type="number" 
            min="1" 
            placeholder="Minutes" 
            value={time} 
            onChange={e => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </FormGroup>
        <FormGroup>
          <Label>Date</Label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </FormGroup>
        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
          <Button type="button" onClick={handleLog}>Log Time</Button>
        </div>
      </div>
    </div>
  );
};

const TaskForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(() => {
    const baseData = { 
      title: '', description: '', priority: 'medium', status: 'todo', 
      dueDate: '', category: 'General', subtasks: [], timeLogs: [], progress: 0
    };
    if (initialData) {
      return { ...baseData, ...initialData };
    }
    return baseData;
  });

  const [modalTab, setModalTab] = useState('details');
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [loggingSubtask, setLoggingSubtask] = useState(undefined);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const totalTimeSpent = [
    ...(formData.timeLogs || []),
    ...(formData.subtasks || []).flatMap(s => s.timeLogs || [])
  ].reduce((acc, log) => acc + log.minutes, 0);

  // Subtask Helpers
  const addSubtask = () => { 
    if(newSubtask.trim()){ 
      const updatedSubtasks = [...(formData.subtasks || []), {id: crypto.randomUUID(), title: newSubtask, completed: false, timeLogs: []}];
      setFormData({...formData, subtasks: updatedSubtasks}); 
      setNewSubtask(''); 
    }
  };
  const toggleSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.map(s => s.id === id ? {...s, completed: !s.completed} : s)});
  const removeSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.filter(s => s.id !== id)});
  const startEditSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskText(subtask.title);
  };
  const saveEditSubtask = () => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.map(s => 
        s.id === editingSubtaskId ? { ...s, title: editingSubtaskText } : s
      )
    });
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  // Time Log Helpers
  const handleLogTime = (logData) => {
    const newLog = { ...logData, id: crypto.randomUUID() };
    if (loggingSubtask && !loggingSubtask.isMainTask) { // It's a subtask
      setFormData({
        ...formData,
        subtasks: formData.subtasks.map(s => 
          s.id === loggingSubtask.id ? { ...s, timeLogs: [...(s.timeLogs || []), newLog] } : s
        )
      });
    } else { // It's the main task
      setFormData({ ...formData, timeLogs: [...(formData.timeLogs || []), newLog] });
    }
    setLoggingSubtask(undefined);
  };
  
  const handleDeleteLog = (logToDelete) => {
    if (window.confirm('Are you sure you want to delete this time log?')) {
      if (logToDelete.subtaskId) {
        setFormData({
          ...formData,
          subtasks: formData.subtasks.map(s => 
            s.id === logToDelete.subtaskId ? { ...s, timeLogs: s.timeLogs.filter(l => l.id !== logToDelete.id) } : s
          )
        });
      } else {
        setFormData({
          ...formData,
          timeLogs: formData.timeLogs.filter(l => l.id !== logToDelete.id)
        });
      }
    }
  };

  const handleCancelTimeLog = () => {
    setLoggingSubtask(undefined);
  };

  return (
    <>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-bold">{initialData ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onCancel}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        
        <div className="flex border-b border-slate-100 bg-white shrink-0">
          {['details', 'subtasks', 'time'].map(tab => (
            <button 
              key={tab} 
              type="button"
              onClick={() => setModalTab(tab)} 
              className={`flex-1 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${modalTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'time' ? `Time (${formatDuration(totalTimeSpent)})` : tab === 'subtasks' ? `Subtasks (${formData.subtasks?.length || 0})` : tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <Form id="task-form" onSubmit={handleSubmit}>
            {modalTab === 'details' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Details Form Groups */}
                <FormGroup>
                  <Label htmlFor="title">Task Title</Label>
                  <Input id="title" type="text" placeholder="Task Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows="3" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormGroup>
                <div className="grid grid-cols-2 gap-4">
                  <FormGroup>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="category">Category</Label>
                    <Select id="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option>General</option><option>Work</option><option>Personal</option><option>Shopping</option><option>Health</option>
                    </Select>
                  </FormGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormGroup>
                    <Label>Priority</Label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high'].map(p => (
                        <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${formData.priority === p ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-600' : p === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{p}</button>
                      ))}
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
                    </Select>
                  </FormGroup>
                </div>
                <FormGroup>
                  <Label htmlFor="progress">Progress: {formData.progress || 0}%</Label>
                  <input id="progress" type="range" min="0" max="100" value={formData.progress || 0} onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </FormGroup>
              </div>
            )}

            {modalTab === 'subtasks' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex gap-2">
                  <input type="text" name="newSubtask" placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  <Button type="button" onClick={addSubtask}>Add</Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(formData.subtasks || []).map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded group">
                      <button type="button" onClick={() => toggleSubtask(s.id)}><CheckSquare size={16} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/></button>
                      {editingSubtaskId === s.id ? (
                        <input type="text" value={editingSubtaskText} onChange={e => setEditingSubtaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveEditSubtask())} className="flex-1 text-sm p-1 border border-indigo-300 rounded" autoFocus />
                      ) : (
                        <span className={`flex-1 text-sm ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span>
                      )}
                      {s.timeLogs?.length > 0 && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{formatDuration(s.timeLogs.reduce((acc, log) => acc + log.minutes, 0))}</span>
                      )}
                      <div className="flex items-center">
                        {editingSubtaskId === s.id ? (
                          <button type="button" onClick={saveEditSubtask} className="p-1 text-emerald-600 hover:text-emerald-800"><Check size={16}/></button>
                        ) : (
                          <>
                            <button type="button" onClick={() => setLoggingSubtask(s)} className="p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600"><Clock size={14}/></button>
                            <button type="button" onClick={() => startEditSubtask(s)} className="p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600"><Edit2 size={14}/></button>
                          </>
                        )}
                        <button type="button" onClick={() => removeSubtask(s.id)}><X size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600"/></button>
                      </div>
                    </div>
                  ))}
                </div>
                {(!formData.subtasks || formData.subtasks.length === 0) && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">No subtasks yet</div>}
              </div>
            )}

            {modalTab === 'time' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Time Logs</h4>
                  <Button type="button" onClick={() => setLoggingSubtask({ isMainTask: true })}><Plus size={16}/> Log Time</Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(formData.timeLogs || []).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <span className="font-medium">{formatDuration(log.minutes)}</span>
                        <span className="text-xs text-slate-500 ml-2">{log.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Removed Edit button */}
                        <button onClick={() => handleDeleteLog(log)}><Trash2 size={14} className="text-slate-400 hover:text-red-600"/></button>
                      </div>
                    </div>
                  ))}
                  {(formData.subtasks || []).map(s => (
                    (s.timeLogs || []).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-2 pl-6 bg-slate-50 rounded">
                        <div>
                          <span className="font-medium">{formatDuration(log.minutes)}</span>
                          <span className="text-xs text-slate-500 ml-2">{log.date} on <span className="font-semibold">{s.title}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Removed Edit button */}
                          <button onClick={() => handleDeleteLog({...log, subtaskId: s.id})}><Trash2 size={14} className="text-slate-400 hover:text-red-600"/></button>
                        </div>
                      </div>
                    ))
                  ))}
                  {totalTimeSpent === 0 && <div className="text-center py-6 text-slate-400 text-sm">No time logged yet.</div>}
                </div>
              </div>
            )}
          </Form>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
          <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
          <Button type="submit" form="task-form">Save Task</Button>
        </div>
      </div>
      {(loggingSubtask !== undefined) && (
        <TimeLogModal 
          subtask={loggingSubtask}
          onLog={handleLogTime}
          onCancel={handleCancelTimeLog}
        />
      )}
    </>
  );
};

export default TaskForm;
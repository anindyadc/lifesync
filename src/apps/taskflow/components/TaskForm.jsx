import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Plus } from 'lucide-react';
import { formatDuration } from '../../../lib/utils';
import { Form, FormGroup, Label, Input, Textarea, Select, Button } from '../../../components/Form';

const TaskForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({ 
    title: '', description: '', priority: 'medium', status: 'todo', 
    dueDate: '', category: 'General', subtasks: [], timeSpent: 0 
  });
  const [modalTab, setModalTab] = useState('details');
  const [newSubtask, setNewSubtask] = useState('');
  const [logTimeAmount, setLogTimeAmount] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        status: initialData.status || 'todo',
        dueDate: initialData.dueDate || '',
        category: initialData.category || 'General',
        subtasks: initialData.subtasks || [],
        timeSpent: initialData.timeSpent || 0
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Subtask Helpers
  const addSubtask = () => { 
    if(newSubtask.trim()){ 
      setFormData({...formData, subtasks: [...formData.subtasks, {id: crypto.randomUUID(), title: newSubtask, completed: false}]}); 
      setNewSubtask(''); 
    }
  };
  const toggleSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.map(s => s.id === id ? {...s, completed: !s.completed} : s)});
  const removeSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.filter(s => s.id !== id)});

  // Time Log Helper
  const addLog = () => {
    if(logTimeAmount) { 
      setFormData({...formData, timeSpent: (formData.timeSpent||0) + parseInt(logTimeAmount)}); 
      setLogTimeAmount(''); 
    }
  };

  return (
    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
        <h3 className="text-lg font-bold">{initialData ? 'Edit Task' : 'New Task'}</h3>
        <button onClick={onCancel}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white shrink-0">
        {['details', 'subtasks', 'time'].map(tab => (
          <button 
            key={tab} 
            type="button"
            onClick={() => setModalTab(tab)} 
            className={`flex-1 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${modalTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'time' ? `Time (${formatDuration(formData.timeSpent)})` : tab === 'subtasks' ? `Subtasks (${formData.subtasks.length})` : tab}
          </button>
        ))}
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <Form id="task-form" onSubmit={handleSubmit}>
          {modalTab === 'details' && (
            <div className="space-y-4 animate-in fade-in">
              <FormGroup>
                <Label htmlFor="title">Task Title</Label>
                <Input 
                  id="title"
                  type="text" 
                  placeholder="Task Title" 
                  required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  rows="3" 
                  placeholder="Description" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </FormGroup>
              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input 
                    id="dueDate"
                    type="date" 
                    value={formData.dueDate} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    id="category"
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option>General</option><option>Work</option><option>Personal</option><option>Shopping</option><option>Health</option>
                  </Select>
                </FormGroup>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label>Priority</Label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map(p => (
                      <button 
                        key={p} 
                        type="button" 
                        onClick={() => setFormData({...formData, priority: p})} 
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${formData.priority === p ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-600' : p === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    id="status"
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
                  </Select>
                </FormGroup>
              </div>
            </div>
          )}

          {modalTab === 'subtasks' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  placeholder="Add subtask..." 
                  value={newSubtask} 
                  onChange={e => setNewSubtask(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} 
                />
                <Button type="button" onClick={addSubtask}>Add</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {formData.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded group">
                    <button type="button" onClick={() => toggleSubtask(s.id)}>
                      <CheckSquare size={16} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/>
                    </button>
                    <span className={`flex-1 text-sm ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span>
                    <button type="button" onClick={() => removeSubtask(s.id)}>
                      <X size={14} className="text-slate-400 opacity-0 group-hover:opacity-100"/>
                    </button>
                  </div>
                ))}
              </div>
              {formData.subtasks.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">No subtasks yet</div>}
            </div>
          )}

          {modalTab === 'time' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-emerald-50 p-6 rounded-xl text-center border border-emerald-100">
                <div className="text-sm text-emerald-600 font-medium mb-1">Total Time Logged</div>
                <div className="text-3xl font-bold text-emerald-700">{formatDuration(formData.timeSpent)}</div>
              </div>
              <FormGroup>
                <Label>Log Additional Time (Minutes)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    min="1" 
                    placeholder="e.g. 30" 
                    value={logTimeAmount} 
                    onChange={e => setLogTimeAmount(e.target.value)} 
                  />
                  <Button type="button" onClick={addLog} className="bg-emerald-600 hover:bg-emerald-700"><Plus size={16}/> Add Log</Button>
                </div>
              </FormGroup>
            </div>
          )}
        </Form>
      </div>
      
      <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
        <Button type="button" onClick={onCancel} className="bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</Button>
        <Button type="submit" form="task-form">Save Task</Button>
      </div>
    </div>
  );
};

export default TaskForm;
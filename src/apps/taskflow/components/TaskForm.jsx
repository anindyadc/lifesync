import React, { useState } from 'react';
import { X, CheckSquare, Plus, Edit2, Check, Clock, Trash2, ClipboardList, ListChecks } from 'lucide-react';
import { formatDuration, toISODate } from '../../../lib/utils';
import { TASK_TYPES } from '../constants';

const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

const TimeLogModal = ({ onLog, onCancel, subtask }) => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [error, setError] = useState('');

  const handleLog = () => {
    const minutes = Number(time);
    if (!time || !Number.isFinite(minutes) || minutes <= 0) {
      setError('Enter a positive number of minutes.');
      return;
    }
    setError('');
    onLog({ minutes: Math.round(minutes), date });
  };

  const title = subtask && !subtask.isMainTask ? `Log Time for: ${subtask.title}` : 'Log Time for Task';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
        <h3 className="text-[15px] font-semibold text-slate-800 mb-4 flex items-center gap-1.5"><Clock className="text-indigo-600" size={16} />{title}</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Minutes</label>
            <input
              type="number"
              min="1"
              placeholder="Minutes"
              value={time}
              onChange={e => { setTime(e.target.value); if (error) setError(''); }}
              className={fieldClass}
            />
            {error && <p className="text-[11px] font-semibold text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-sm rounded-lg transition-colors">Cancel</button>
          <button type="button" onClick={handleLog} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">Log Time</button>
        </div>
      </div>
    </div>
  );
};

const TaskForm = ({ initialData, onSubmit, onCancel, categories = [], offices = [] }) => {
  const [formData, setFormData] = useState(() => {
    const baseData = {
      title: '', description: '', priority: 'medium', status: 'todo',
      dueDate: '', category: categories[0]?.id || 'General', taskType: 'personal', office: '',
      subtasks: [], timeLogs: [], progress: 0
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

  const hasSubtasks = (formData.subtasks || []).length > 0;

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
  const removeSubtask = (id) => {
    const subtask = formData.subtasks.find(s => s.id === id);
    const hasTimeLogs = subtask?.timeLogs?.length > 0;
    if (hasTimeLogs && !window.confirm('This subtask has logged time. Delete it and its time logs?')) return;
    setFormData({...formData, subtasks: formData.subtasks.filter(s => s.id !== id)});
  };
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
            {initialData ? <Edit2 className="text-indigo-600" size={16} /> : <ClipboardList className="text-indigo-600" size={16} />}
            {initialData ? 'Edit Task' : 'New Task'}
          </h3>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"><X size={16}/></button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 bg-white shrink-0 px-2 pt-2">
          {['details', 'subtasks', 'time'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setModalTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-t-lg capitalize transition-colors border-b-2 ${modalTab === tab ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              {tab === 'time' ? `Time (${formatDuration(totalTimeSpent)})` : tab === 'subtasks' ? `Subtasks (${formData.subtasks?.length || 0})` : tab}
            </button>
          ))}
        </div>

        <form id="task-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4">
          {modalTab === 'details' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className={labelClass} htmlFor="title">Task Title</label>
                <input id="title" type="text" placeholder="Task Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="description">Description</label>
                <textarea id="description" rows="3" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={fieldClass} />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5 custom-scrollbar">
                  {categories.map(cat => {
                    const isSelected = formData.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        style={isSelected ? { borderColor: cat.color } : {}}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                          isSelected
                            ? `${cat.bg || 'bg-indigo-50 text-indigo-700'}`
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <div className="flex gap-2">
                  {TASK_TYPES.map(t => {
                    const Icon = t.icon;
                    const isSelected = formData.taskType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, taskType: t.id, office: t.id === 'official' ? formData.office : '' })}
                        className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                      >
                        <Icon size={13} /> {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.taskType === 'official' && (
                <div>
                  <label className={labelClass}>Office</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5 custom-scrollbar">
                    {offices.map(o => {
                      const isSelected = formData.office === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, office: o.id })}
                          style={isSelected ? { borderColor: o.color } : {}}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                            isSelected
                              ? `${o.bg || 'bg-indigo-50 text-indigo-700'}`
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                    {offices.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No offices configured — add one via Manage Categories &amp; Offices.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="dueDate">Due Date</label>
                  <input id="dueDate" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="status">Status</label>
                  <select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={fieldClass}>
                    <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Priority</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(p => (
                    <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-lg border transition-all ${formData.priority === p ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-600' : p === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Progress: {hasSubtasks ? Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100) : (formData.progress || 0)}%
                </label>
                <input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  disabled={hasSubtasks}
                  value={hasSubtasks ? Math.round((formData.subtasks.filter(s => s.completed).length / formData.subtasks.length) * 100) : (formData.progress || 0)}
                  onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer"
                />
                {hasSubtasks && (
                  <p className="text-[11px] font-medium text-slate-400 mt-1">Auto-calculated from subtask completion — switch to the Subtasks tab to change it.</p>
                )}
              </div>
            </div>
          )}

          {modalTab === 'subtasks' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex gap-2">
                <input type="text" name="newSubtask" placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} className={fieldClass} />
                <button type="button" onClick={addSubtask} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors shrink-0">Add</button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(formData.subtasks || []).map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg hover:bg-slate-100/70 transition-colors group">
                    <button type="button" onClick={() => toggleSubtask(s.id)} className="p-1 rounded-md hover:bg-white transition-colors shrink-0"><CheckSquare size={16} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/></button>
                    {editingSubtaskId === s.id ? (
                      <input type="text" value={editingSubtaskText} onChange={e => setEditingSubtaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveEditSubtask())} className="flex-1 text-sm px-2 py-1 bg-white border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500/40 outline-none" autoFocus />
                    ) : (
                      <span className={`flex-1 text-sm truncate ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span>
                    )}
                    {s.timeLogs?.length > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">{formatDuration(s.timeLogs.reduce((acc, log) => acc + log.minutes, 0))}</span>
                    )}
                    <div className="flex items-center shrink-0">
                      {editingSubtaskId === s.id ? (
                        <button type="button" onClick={saveEditSubtask} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"><Check size={15}/></button>
                      ) : (
                        <>
                          <button type="button" onClick={() => setLoggingSubtask(s)} className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-indigo-600 transition-colors"><Clock size={14}/></button>
                          <button type="button" onClick={() => startEditSubtask(s)} className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-indigo-600 transition-colors"><Edit2 size={14}/></button>
                        </>
                      )}
                      <button type="button" onClick={() => removeSubtask(s.id)} className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-600 transition-colors"><X size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
              {(!formData.subtasks || formData.subtasks.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                  <ListChecks size={20} className="mx-auto mb-2 text-slate-300" />
                  No subtasks yet
                </div>
              )}
            </div>
          )}

          {modalTab === 'time' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm text-slate-800">Time Logs</h4>
                <button type="button" onClick={() => setLoggingSubtask({ isMainTask: true })} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"><Plus size={14}/> Log Time</button>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(formData.timeLogs || []).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100/70 transition-colors">
                    <div>
                      <span className="text-sm font-semibold">{formatDuration(log.minutes)}</span>
                      <span className="text-xs text-slate-500 ml-2">{log.date}</span>
                    </div>
                    <button onClick={() => handleDeleteLog(log)} className="p-1.5 rounded-md text-slate-400 hover:bg-white hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
                {(formData.subtasks || []).map(s => (
                  (s.timeLogs || []).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2 pl-6 bg-slate-50 rounded-lg hover:bg-slate-100/70 transition-colors">
                      <div>
                        <span className="text-sm font-semibold">{formatDuration(log.minutes)}</span>
                        <span className="text-xs text-slate-500 ml-2">{log.date} on <span className="font-semibold">{s.title}</span></span>
                      </div>
                      <button onClick={() => handleDeleteLog({...log, subtaskId: s.id})} className="p-1.5 rounded-md text-slate-400 hover:bg-white hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  ))
                ))}
                {totalTimeSpent === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                    <Clock size={20} className="mx-auto mb-2 text-slate-300" />
                    No time logged yet
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        <div className="px-5 py-2.5 border-t border-slate-100 flex justify-end gap-2 bg-white shrink-0">
          <button type="button" onClick={onCancel} className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-sm rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="task-form" className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">Save Task</button>
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

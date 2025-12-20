import React, { useState } from 'react';
import { Edit2, Trash2, Tag, Calendar, Timer, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDuration } from '../../../lib/utils';

const TaskList = ({ tasks, onEdit, onDelete, onStatusChange, filterStatus, setFilterStatus }) => {
  const [expandedTask, setExpandedTask] = useState(null);
  const displayedTasks = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus);

  const getPriorityColor = (p) => { 
    switch(p) { 
      case 'high': return 'text-red-600 bg-red-50 border-red-200'; 
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'; 
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200'; 
      default: return 'text-slate-600 bg-slate-50'; 
    } 
  };
  const toggleExpand = (id) => setExpandedTask(expandedTask === id ? null : id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
         <span className="font-bold text-slate-800">Task List</span>
         <div className="flex gap-2">
           {['all', 'todo', 'done'].map(s => (
             <button 
               key={s} 
               onClick={() => setFilterStatus(s)} 
               className={`text-xs px-2 py-1 rounded capitalize transition-colors ${filterStatus === s ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
             >
               {s}
             </button>
           ))}
         </div>
      </div>
      
      <div className="divide-y divide-slate-100">
        {displayedTasks.map(task => {
          const subCompleted = task.subtasks?.filter(s => s.completed).length || 0; 
          const subTotal = task.subtasks?.length || 0; 
          const progress = subTotal > 0 ? (subCompleted / subTotal) * 100 : 0;
          
          return (
            <div key={task.id}>
              <div className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors group">
                <div className="flex gap-3 flex-1 min-w-0">
                   <button 
                     onClick={() => onStatusChange(task.id, task.status)} 
                     className={`mt-1 w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                   >
                     <Check size={14} className={task.status === 'done' ? 'opacity-100' : 'opacity-0'} />
                   </button>
                   
                   <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-slate-800 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                      {task.description && <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>}
                      
                      {subTotal > 0 && (
                        <div className="mt-2 w-full max-w-xs">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Subtasks</span><span>{subCompleted}/{subTotal}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <Tag size={12}/> {task.category}
                        </span>
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <Calendar size={12}/> {task.dueDate}
                          </span>
                        )}
                        {task.timeSpent > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-1 font-medium border border-emerald-100">
                            <Timer size={10}/> {formatDuration(task.timeSpent)}
                          </span>
                        )}
                      </div>
                   </div>
                </div>
                
                <div className="flex gap-1 items-center pl-4">
                  {subTotal > 0 && (
                    <button onClick={() => toggleExpand(task.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
                      {expandedTask === task.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(task)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedTask === task.id && (
                <div className="pl-12 pr-6 pb-4 animate-in fade-in">
                  <div className="space-y-2">
                    {task.subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-3">
                        <Check size={14} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/>
                        <span className={`text-sm ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {displayedTasks.length === 0 && <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">No tasks found.</div>}
      </div>
    </div>
  );
};

export default TaskList;
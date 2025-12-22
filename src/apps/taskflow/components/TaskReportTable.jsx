import React from 'react';
import { formatDuration } from '../../../lib/utils';

const TaskReportTable = ({ tasks }) => {
  const getStatusColor = (s) => { 
    switch(s) { 
      case 'done': return 'bg-indigo-100 text-indigo-700'; 
      case 'in-progress': return 'bg-blue-100 text-blue-700'; 
      default: return 'bg-slate-100 text-slate-700'; 
    } 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800">Detailed Report</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">Task</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tasks.slice(0, 5).map(task => {
              const subDone = task.subtasks?.filter(s => s.completed).length || 0; 
              const subTotal = task.subtasks?.length || 0;
              const percent = subTotal ? (subDone/subTotal)*100 : 0;
              
              const taskTime = (task.timeLogs || []).reduce((acc, log) => acc + (log.minutes || 0), 0);
              const subtaskTime = (task.subtasks || []).reduce((acc, subtask) => {
                return acc + (subtask.timeLogs || []).reduce((sAcc, log) => sAcc + (log.minutes || 0), 0);
              }, 0);
              const totalTime = taskTime + subtaskTime;
              
              return (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{task.title}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs capitalize ${getStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }}/>
                      </div>
                      <span className="text-xs">{subDone}/{subTotal}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono">{formatDuration(totalTime)}</td>
                </tr>
              );
            })}
            {tasks.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No tasks yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskReportTable;
import React from 'react';
import { formatDuration } from '../../../lib/utils';
import { Clock } from 'lucide-react';

const TimeReport = ({ tasks, dateRange, onDateChange }) => {
  const allTasksWithTime = tasks.filter(t => t.timeLogs?.length > 0 || t.subtasks?.some(s => s.timeLogs?.length > 0));
  
  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    onDateChange({ ...dateRange, [name]: new Date(value) });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Time Report</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="text-sm font-medium text-slate-600">From:</label>
          <input 
            type="date" 
            name="from"
            value={dateRange.from.toISOString().split('T')[0]}
            onChange={handleDateInputChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full sm:w-auto"
          />
          <label className="text-sm font-medium text-slate-600">To:</label>
          <input 
            type="date" 
            name="to"
            value={dateRange.to.toISOString().split('T')[0]}
            onChange={handleDateInputChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full sm:w-auto"
          />
        </div>
      </div>
      <div className="space-y-4">
        {allTasksWithTime.map(task => {
          const taskTime = task.timeLogs?.reduce((acc, log) => acc + log.minutes, 0) || 0;
          const subtaskTime = task.subtasks?.reduce((acc, s) => acc + (s.timeLogs?.reduce((sAcc, log) => sAcc + log.minutes, 0) || 0), 0) || 0;
          const totalTaskTime = taskTime + subtaskTime;

          return (
            <div key={task.id} className="p-4 bg-slate-50/80 rounded-lg border border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">{task.title}</h3>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1.5">
                  <Clock size={13}/> Total: {formatDuration(totalTaskTime)}
                </span>
              </div>
              <div className="pl-4 mt-2 space-y-1.5">
                {task.timeLogs?.map(log => (
                  <div key={log.id} className="flex justify-between text-xs">
                    <span className="text-slate-500">- (Task-level time on {log.date})</span>
                    <span className="font-medium text-slate-700">{formatDuration(log.minutes)}</span>
                  </div>
                ))}
                {task.subtasks?.map(s => s.timeLogs?.map(log => (
                  <div key={log.id} className="flex justify-between text-xs text-slate-600">
                    <span>- {s.title} (on {log.date})</span>
                    <span className="font-medium">{formatDuration(log.minutes)}</span>
                  </div>
                )))}
              </div>
            </div>
          );
        })}
        {allTasksWithTime.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Clock size={32} className="mx-auto mb-2"/>
            No time logged for any tasks in the selected date range.
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeReport;

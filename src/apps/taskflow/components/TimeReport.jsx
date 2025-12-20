import React from 'react';
import { formatDuration } from '../../../lib/utils';
import { Clock } from 'lucide-react';

const TimeReport = ({ tasks }) => {
  const allTasksWithTime = tasks.filter(t => t.timeLogs?.length > 0 || t.subtasks?.some(s => s.timeLogs?.length > 0));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Time Report</h2>
      <div className="space-y-4">
        {allTasksWithTime.map(task => {
          const taskTime = task.timeLogs?.reduce((acc, log) => acc + log.minutes, 0) || 0;
          const subtaskTime = task.subtasks?.reduce((acc, s) => acc + (s.timeLogs?.reduce((sAcc, log) => sAcc + log.minutes, 0) || 0), 0) || 0;
          const totalTaskTime = taskTime + subtaskTime;

          return (
            <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">{task.title}</h3>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock size={12}/> Total: {formatDuration(totalTaskTime)}
                </span>
              </div>
              <div className="pl-4 mt-2 space-y-1">
                {task.timeLogs?.map(log => (
                  <div key={log.id} className="flex justify-between text-sm">
                    <span>- (Task-level time on {log.date})</span>
                    <span className="font-medium">{formatDuration(log.minutes)}</span>
                  </div>
                ))}
                {task.subtasks?.map(s => s.timeLogs?.map(log => (
                  <div key={log.id} className="flex justify-between text-sm text-slate-600">
                    <span>- {s.title} (on {log.date})</span>
                    <span className="font-medium">{formatDuration(log.minutes)}</span>
                  </div>
                )))}
              </div>
            </div>
          );
        })}
        {allTasksWithTime.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            No time logged for any tasks yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeReport;

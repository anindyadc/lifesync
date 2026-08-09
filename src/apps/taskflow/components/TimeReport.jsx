import React, { useState, useMemo } from 'react';
import { formatDuration, safeGetDate, toISODate } from '../../../lib/utils';
import { Clock, Building2 } from 'lucide-react';
import { TASK_TYPES, getTaskType } from '../constants';
import { getTaskMinutes } from '../hooks/useTasks';

const TimeReport = ({ tasks, offices = [], dateRange, onDateChange }) => {
  const [filterType, setFilterType] = useState('');
  const [filterOffice, setFilterOffice] = useState('');

  const scopedTasks = useMemo(() => tasks.filter(t => {
    if (filterType && getTaskType(t) !== filterType) return false;
    if (filterOffice && t.office !== filterOffice) return false;
    return true;
  }), [tasks, filterType, filterOffice]);

  const tasksInReport = useMemo(() => {
    return scopedTasks.map(task => {
      const taskTimeLogs = task.timeLogs?.filter(log => {
        const logDate = safeGetDate(log.date);
        return logDate && logDate >= dateRange.from && logDate <= dateRange.to;
      }) || [];

      const subtasksWithTime = task.subtasks
        ?.map(s => {
          const subtaskTimeLogs = s.timeLogs?.filter(log => {
            const logDate = safeGetDate(log.date);
            return logDate && logDate >= dateRange.from && logDate <= dateRange.to;
          }) || [];
          return { ...s, timeLogs: subtaskTimeLogs };
        })
        .filter(s => s.timeLogs.length > 0);

      return {
        ...task,
        timeLogs: taskTimeLogs,
        subtasks: subtasksWithTime,
      };
    }).filter(task => task.timeLogs.length > 0 || task.subtasks.length > 0);
  }, [scopedTasks, dateRange]);

  // tasksInReport's timeLogs/subtasks are already trimmed to the selected date range
  // (see above), so the shared getTaskMinutes — normally "every log, no date filter" —
  // works unchanged here too: it just sums whatever logs are present on the task.
  const grandTotalMinutes = tasksInReport.reduce((total, task) => total + getTaskMinutes(task), 0);

  // Time-spent breakdowns for the "which office/project did my time actually go to"
  // question — grouped from the same date-range-trimmed tasksInReport used below, so the
  // totals always match the per-task list and the grand total exactly.
  const byOffice = useMemo(() => {
    const buckets = {};
    tasksInReport.forEach(task => {
      const taskType = getTaskType(task);
      const key = taskType === 'official' ? (task.office || 'Unspecified office') : 'Personal';
      const office = offices.find(o => o.id === task.office);
      const label = taskType === 'official' ? (office?.label || task.office || 'Unspecified office') : 'Personal';
      buckets[key] = buckets[key] || { label, minutes: 0 };
      buckets[key].minutes += getTaskMinutes(task);
    });
    return Object.values(buckets).sort((a, b) => b.minutes - a.minutes);
  }, [tasksInReport, offices]);

  const byCategory = useMemo(() => {
    const buckets = {};
    tasksInReport.forEach(task => {
      const key = task.category || 'Uncategorized';
      buckets[key] = buckets[key] || { label: key, minutes: 0 };
      buckets[key].minutes += getTaskMinutes(task);
    });
    return Object.values(buckets).sort((a, b) => b.minutes - a.minutes);
  }, [tasksInReport]);

  const handleDateInputChange = (e) => {
    const { name, value } = e.target;
    // safeGetDate, not `new Date(value)` — a raw 'YYYY-MM-DD' string parses as UTC and
    // would silently shift the boundary day for users east of UTC.
    onDateChange({ ...dateRange, [name]: safeGetDate(value) });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Time Report</h2>
          <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Clock size={14}/> 
            <span>Grand Total: {formatDuration(grandTotalMinutes)}</span>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="text-sm font-medium text-slate-600">From:</label>
          <input 
            type="date" 
            name="from"
            value={toISODate(dateRange.from)}
            onChange={handleDateInputChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full sm:w-auto"
          />
          <label className="text-sm font-medium text-slate-600">To:</label>
          <input 
            type="date" 
            name="to"
            value={toISODate(dateRange.to)}
            onChange={handleDateInputChange}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Scope:</span>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); if (e.target.value !== 'official') setFilterOffice(''); }}
          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer"
        >
          <option value="">All Types</option>
          {TASK_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {filterType === 'official' && offices.length > 0 && (
          <select
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="">All Offices</option>
            {offices.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {tasksInReport.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-1.5"><Building2 size={14}/> Time by Office</h4>
            <div className="space-y-1.5">
              {byOffice.map(b => (
                <div key={b.label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{b.label}</span>
                  <span className="font-semibold text-slate-800">{formatDuration(b.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-1.5"><Clock size={14}/> Time by Category / Project</h4>
            <div className="space-y-1.5">
              {byCategory.map(b => (
                <div key={b.label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{b.label}</span>
                  <span className="font-semibold text-slate-800">{formatDuration(b.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tasksInReport.map(task => {
          const totalTaskTime = getTaskMinutes(task);

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
        {tasksInReport.length === 0 && (
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

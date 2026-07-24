import React from 'react';
import { CheckSquare, Timer, ListTodo, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDuration } from '../../../lib/utils';
import { STATUS_COLORS } from '../constants';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, delta }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        {Icon && <Icon size={20} />}
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-slate-400">{subtext}</span>
      {delta && (
        <span className="flex items-center gap-1 ml-2 font-bold text-xs" style={{ color: delta.color }}>
          {delta.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta.pct)}pt vs last month
        </span>
      )}
    </div>
  </div>
);

const DashboardStats = ({ stats, previousCompletionRate = null }) => {
  const deltaPts = previousCompletionRate !== null ? stats.completionRate - previousCompletionRate : null;
  const deltaUp = deltaPts !== null && deltaPts > 0;
  // Higher completion rate is the desirable direction — up = good (green), down = critical (red).
  const delta = deltaPts !== null && deltaPts !== 0
    ? { pct: deltaPts, up: deltaUp, color: deltaUp ? STATUS_COLORS.good : STATUS_COLORS.critical }
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Tasks"
        value={stats.total}
        subtext={`${stats.completed} Completed`}
        icon={CheckSquare}
        colorClass="bg-blue-100 text-blue-600"
      />
      <StatCard
        title="Total Time"
        value={formatDuration(stats.time)}
        subtext="Logged hours"
        icon={Timer}
        colorClass="bg-emerald-100 text-emerald-600"
      />
      <StatCard
        title="Subtasks"
        value={`${stats.completedSubtasks}/${stats.totalSubtasks}`}
        subtext="Progress"
        icon={ListTodo}
        colorClass="bg-amber-100 text-amber-600"
      />
      <StatCard
        title="Efficiency"
        value={`${stats.completionRate}%`}
        subtext="Completion rate"
        icon={TrendingUp}
        colorClass="bg-indigo-100 text-indigo-600"
        delta={delta}
      />
    </div>
  );
};

export default DashboardStats;
import React from 'react';
import { CheckSquare, Timer, ListTodo, TrendingUp, CheckCircle } from 'lucide-react';
import { formatDuration } from '../../../lib/utils';

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

const DashboardStats = ({ stats }) => {
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
      />
    </div>
  );
};

export default DashboardStats;
import React, { useMemo } from 'react';
import { History, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

/**
 * StatSummary Component
 * Calculates and displays a grid of counts for the incident dashboard.
 */
const StatSummary = ({ incidents = [], onCriticalClick, isCriticalFilterActive }) => {
  const stats = useMemo(() => ({
    total: incidents.length,
    critical: incidents.filter(i => i.priority === 'critical').length,
    active: incidents.filter(i => i.status !== 'resolved').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  }), [incidents]);

  const cards = [
    { 
      label: 'Total', 
      count: stats.total, 
      icon: <History className="text-slate-400" />, 
      color: 'bg-slate-50' 
    },
    {
      label: 'Critical',
      count: stats.critical,
      icon: <AlertCircle className="text-red-500" />,
      color: 'bg-red-50',
      onClick: onCriticalClick,
      active: isCriticalFilterActive,
    },
    { 
      label: 'Active', 
      count: stats.active, 
      icon: <Clock className="text-amber-500" />, 
      color: 'bg-amber-50' 
    },
    { 
      label: 'Resolved', 
      count: stats.resolved, 
      icon: <CheckCircle2 className="text-emerald-500" />, 
      color: 'bg-emerald-50' 
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
      {cards.map((s, idx) => {
        const Tag = s.onClick ? 'button' : 'div';
        return (
          <Tag
            key={idx}
            type={s.onClick ? 'button' : undefined}
            onClick={s.onClick}
            title={s.onClick ? (s.active ? 'Clear priority filter' : 'Show only critical incidents') : undefined}
            className={`text-left rounded-3xl bg-white p-6 shadow-sm ring-1 transition-transform hover:scale-[1.02] ${s.active ? 'ring-red-300' : 'ring-slate-200'}`}
          >
            <div className={`mb-4 inline-flex items-center justify-center rounded-2xl p-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{s.count}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
          </Tag>
        );
      })}
    </div>
  );
};

export default StatSummary;

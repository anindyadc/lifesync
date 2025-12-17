import React from 'react';
import { Server, Calendar, Activity } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const ChangeCard = ({ change, onClick }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Server size={18} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{change.serverName}</h4>
            <p className="text-xs text-slate-500">{change.application || 'System'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(change.status)}`}>
          {change.status}
        </span>
      </div>
      <h5 className="font-medium text-slate-900 text-sm mb-1">{change.title}</h5>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{change.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(change.date)}</span>
        <span className="flex items-center gap-1"><Activity size={12}/> {change.type}</span>
      </div>
    </div>
  );
};

export default ChangeCard;
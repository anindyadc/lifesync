import React from 'react';
import { Server, Calendar, Activity, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const ChangeCard = ({ change, onClick, onEdit, onDelete }) => {
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
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <div onClick={onClick} className="flex items-center gap-2 cursor-pointer">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Server size={18} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{change.serverName}</h4>
            <p className="text-xs text-slate-500">{change.application || 'System'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(change.status)}`}>
            {change.status}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(change); }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-transparent hover:border-indigo-200"
            title="Edit Change"
          >
            <Pencil size={14}/>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(change.id); }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
            title="Delete Change"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
      <h5 onClick={onClick} className="font-medium text-slate-900 text-sm mb-1 cursor-pointer">{change.title}</h5>
      <p onClick={onClick} className="text-xs text-slate-500 line-clamp-2 mb-3 cursor-pointer">{change.description}</p>
      <div onClick={onClick} className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100 cursor-pointer">
        <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(change.date)}</span>
        <span className="flex items-center gap-1"><Activity size={12}/> {change.type}</span>
      </div>
    </div>
  );
};

export default ChangeCard;
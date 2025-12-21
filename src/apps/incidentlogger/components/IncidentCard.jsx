import React from 'react';
import { AlertOctagon, CheckCircle, Pencil, Server, Laptop, Calendar, User, Trash2 } from 'lucide-react';

const formatDate = (dateField) => {
  if (!dateField) return '-';
  const d = dateField?.toDate ? dateField.toDate() : new Date(dateField);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  if (status === 'resolved') {
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
        <CheckCircle size={12} /> Resolved
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 animate-pulse">
      <AlertOctagon size={12} /> Open Issue
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    critical: 'bg-red-600 text-white shadow-sm',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white'
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${colors[priority] || colors.low}`}>
      {priority}
    </span>
  );
};

const IncidentCard = ({ incident, onResolve, onEdit, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
      {incident.status === 'open' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
      
      <div className="flex justify-between items-start mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={incident.priority} />
          <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
            <Calendar size={14} />
            {formatDate(incident.dateReported)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(incident)}
            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            title="Edit Details"
          >
            <Pencil size={18} />
          </button>
          <button 
            onClick={() => onDelete(incident.id)}
            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            title="Delete Incident"
          >
            <Trash2 size={18} />
          </button>
          <StatusBadge status={incident.status} />
        </div>
      </div>

      <h4 className="text-xl font-black text-slate-800 mb-3 tracking-tight leading-tight">
        {incident.title}
      </h4>
      
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-600">
          <Server size={14} className="text-slate-400" />
          {incident.serverName}
        </div>
        {incident.application && (
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-slate-600">
            <Laptop size={14} className="text-slate-400" />
            {incident.application}
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-bold text-indigo-600">
          <User size={14} className="text-indigo-400" />
          {incident.reportedBy || 'Unknown Reporter'}
        </div>
      </div>

      <div className="flex-grow">
        <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2 block">Issue Details</label>
        <div className="text-base text-slate-700 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
          {incident.issueDescription}
        </div>
      </div>

      <div className="mt-auto">
        {incident.status === 'resolved' ? (
          <div className="pt-5 border-t border-slate-100">
            <label className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.1em] mb-2 block">✓ Resolution / Fix</label>
            <div className="text-sm text-slate-700 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 leading-relaxed italic">
              {incident.fixProvided || 'No resolution details provided.'}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onResolve(incident)}
            className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-xl text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            <CheckCircle size={18} /> Mark as Resolved
          </button>
        )}
      </div>
    </div>
  );
};

export default IncidentCard;

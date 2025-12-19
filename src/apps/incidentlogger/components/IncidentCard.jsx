import React from 'react';
import { AlertOctagon, CheckCircle, Pencil } from 'lucide-react';

/**
 * UTILS
 * Note: If your local path is different, adjust the import.
 * Standard path: import { formatDate } from '../../../lib/utils';
 */
const formatDate = (dateField) => {
  if (!dateField) return '-';
  const d = dateField?.toDate ? dateField.toDate() : new Date(dateField);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusBadge = ({ status }) => {
  if (status === 'resolved') {
    return (
      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
        <CheckCircle size={10} /> Resolved
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse">
      <AlertOctagon size={10} /> Open
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors[priority] || colors.low}`}>
      {priority}
    </span>
  );
};

/**
 * IncidentCard Component
 * Displays incident details and provides hooks for resolution and editing.
 */
const IncidentCard = ({ incident, onResolve, onEdit }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
      {/* Decorative side bar for open incidents */}
      {incident.status === 'open' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={incident.priority} />
          <span className="text-xs text-slate-400 font-mono">
            {formatDate(incident.dateReported)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Edit button - now visible on hover for all statuses */}
          <button 
            onClick={() => onEdit(incident)}
            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Edit Ticket"
          >
            <Pencil size={14} />
          </button>
          <StatusBadge status={incident.status} />
        </div>
      </div>

      <h4 className="font-bold text-slate-800 mb-1 truncate">{incident.title}</h4>
      
      <div className="text-xs text-slate-500 mb-4 flex flex-wrap gap-2">
        <span className="bg-slate-100 px-2 py-0.5 rounded">Srv: {incident.serverName}</span>
        {incident.application && (
          <span className="bg-slate-100 px-2 py-0.5 rounded">App: {incident.application}</span>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-3 italic">
        {incident.issueDescription}
      </p>

      <div className="mt-auto">
        {incident.status === 'resolved' ? (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-emerald-700 mb-1">✓ Fix Provided:</p>
            <p className="text-sm text-slate-600 line-clamp-2 italic">
              {incident.fixProvided || 'No details provided.'}
            </p>
          </div>
        ) : (
          <button 
            onClick={() => onResolve(incident)}
            className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={14} /> Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
};

// CRITICAL: This default export resolves your "Uncaught SyntaxError"
export default IncidentCard;

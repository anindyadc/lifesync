import React from 'react';
import { CheckCircle, Pencil, Server, User, Trash2, Calendar } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const PRIORITY_STYLES = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-500 text-white',
};
const getPriorityColor = (p) => PRIORITY_STYLES[p] || PRIORITY_STYLES.low;

// List-view counterpart to IncidentCard, same convention as ChangeRow/TransactionRow/
// TaskRow — a sm:grid-cols row instead of a card grid, same fields/handlers.
const IncidentRow = ({ incident, onResolve, onEdit, onDelete }) => (
  <div className={`p-3 hover:bg-slate-50 transition-colors group ${incident.status === 'open' ? 'border-l-2 border-red-400' : ''}`}>
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.8fr)_140px_minmax(0,1fr)_100px_auto] sm:items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
          <Server size={16} />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate">{incident.title}</h4>
          <p className="text-xs text-slate-500 truncate">{incident.serverName}{incident.application ? ` · ${incident.application}` : ''}</p>
        </div>
      </div>

      <div className="pl-11 sm:pl-0 flex items-center gap-2 text-xs text-slate-500">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${getPriorityColor(incident.priority)}`}>
          {incident.priority}
        </span>
      </div>

      <div className="pl-11 sm:pl-0 min-w-0 text-xs text-slate-500">
        <p className="flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> {formatDate(incident.dateReported)}</p>
        <p className="flex items-center gap-1 truncate"><User size={11} className="text-indigo-400" /> {incident.reportedBy || 'Unknown Reporter'}</p>
      </div>

      <div className="pl-11 sm:pl-0">
        {incident.status === 'resolved' ? (
          <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">Resolved</span>
        ) : (
          <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-700 border border-red-200">Open</span>
        )}
      </div>

      <div className="flex gap-1 items-center justify-end pl-11 sm:pl-0 shrink-0">
        {incident.status !== 'resolved' && (
          <button
            onClick={() => onResolve(incident)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            title="Mark as Resolved"
            aria-label="Mark as resolved"
          >
            <CheckCircle size={14}/>
          </button>
        )}
        <button
          onClick={() => onEdit(incident)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Edit Incident"
          aria-label="Edit incident"
        >
          <Pencil size={14}/>
        </button>
        <button
          onClick={() => onDelete(incident.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Delete Incident"
          aria-label="Delete incident"
        >
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  </div>
);

export default IncidentRow;

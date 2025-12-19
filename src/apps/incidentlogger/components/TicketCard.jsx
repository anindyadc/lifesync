import React from 'react';
import { Edit3, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

/**
 * Modular Ticket Component
 * Displays the resolution note and keeps the edit button active regardless of status.
 */
const TicketCard = ({ incident, onEdit }) => {
  const getPriorityColor = () => {
    switch (incident.priority) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'high': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="group bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getPriorityColor()}`}>
          {incident.priority}
        </span>
        <button 
          onClick={() => onEdit(incident)}
          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{incident.title}</h3>
      <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{incident.description}</p>

      {incident.status === 'resolved' && incident.resolutionNotes && (
        <div className="mb-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Resolution Note</p>
          <p className="text-xs italic text-emerald-800 line-clamp-2">{incident.resolutionNotes}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="flex items-center gap-2">
          {incident.status === 'resolved' ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <Clock size={16} className="text-amber-500" />
          )}
          <span className="text-xs font-bold text-slate-600 capitalize">{incident.status}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          {incident.createdAt ? new Date(incident.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
        </span>
      </div>
    </div>
  );
};

export default TicketCard;

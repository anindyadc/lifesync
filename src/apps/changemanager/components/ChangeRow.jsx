import React from 'react';
import { Server, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const STATUS_STYLES = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
};
const getStatusColor = (status) => STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';

const ChangeRow = ({ change, onClick, onEdit, onDelete, onArchive, onUnarchive }) => (
  <div className={`p-3 hover:bg-slate-50 transition-colors group ${change.status === 'archived' ? 'opacity-60' : ''}`}>
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_140px_100px_auto] sm:items-center gap-x-4 gap-y-2">
      <div onClick={onClick} className="flex items-center gap-3 min-w-0 cursor-pointer">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          <Server size={16} />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate">{change.serverName}</h4>
          <p className="text-xs text-slate-500 truncate">{change.application || 'System'}</p>
        </div>
      </div>

      <div onClick={onClick} className="min-w-0 pl-11 sm:pl-0 cursor-pointer">
        <p className="font-medium text-slate-900 text-sm truncate">{change.title}</p>
        <p className="text-xs text-slate-500 truncate">{change.description}</p>
      </div>

      <div className="pl-11 sm:pl-0 text-xs text-slate-500">
        <p>{formatDate(change.date)}</p>
        <p className="text-slate-400">{change.type}</p>
      </div>

      <div className="pl-11 sm:pl-0">
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(change.status)}`}>
          {change.status}
        </span>
      </div>

      <div className="flex gap-1 items-center justify-end pl-11 sm:pl-0 shrink-0">
        {change.status === 'archived' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnarchive(change); }}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            title="Unarchive Change"
            aria-label="Unarchive change"
          >
            <ArchiveRestore size={14}/>
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(change); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Archive Change"
            aria-label="Archive change"
          >
            <Archive size={14}/>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(change); }}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Edit Change"
          aria-label="Edit change"
        >
          <Pencil size={14}/>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(change.id); }}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Delete Change"
          aria-label="Delete change"
        >
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  </div>
);

export default ChangeRow;

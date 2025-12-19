import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

/**
 * ResolveModal Component
 * Restored to the original Incident Logger layout.
 * Features standard padding, rounded-xl corners, and consistent form styling.
 */
const ResolveModal = ({ incident, onClose, onConfirm }) => {
  const [fix, setFix] = useState('');

  if (!incident) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fix.trim()) return;
    onConfirm(incident.id, fix);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            Resolve Incident
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Incident Summary */}
        <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 mb-1">Incident</p>
          <p className="text-sm font-medium text-slate-700 truncate">{incident.title}</p>
        </div>
        
        {/* Resolution Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Resolution / Fix Provided
            </label>
            <textarea 
              autoFocus
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800 resize-none transition-all"
              rows={4}
              value={fix}
              onChange={(e) => setFix(e.target.value)}
              placeholder="Provide details on how the issue was resolved..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!fix.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              Confirm Fix
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveModal;

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

/**
 * Modular Modal Component
 * Now explicitly includes a conditional field for Resolution Notes.
 */
const IncidentModal = ({ initialData, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    resolutionNotes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'open',
        priority: initialData.priority || 'medium',
        resolutionNotes: initialData.resolutionNotes || ''
      });
    }
  }, [initialData]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900">
            {initialData ? 'Update Ticket' : 'New Incident'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Summary</label>
            <input 
              required
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Status</label>
              <select 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="open">Open</option>
                <option value="progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Priority</label>
              <select 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {formData.status === 'resolved' && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Resolution Details</label>
              <textarea 
                required
                className="w-full px-5 py-3.5 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="How was this fixed?"
                value={formData.resolutionNotes}
                onChange={e => setFormData({...formData, resolutionNotes: e.target.value})}
              />
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
            >
              <Save size={20} />
              {initialData ? 'Save Changes' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentModal;

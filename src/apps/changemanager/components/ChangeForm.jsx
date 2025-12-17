import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

const ChangeForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    serverName: '', application: '', type: 'Update', status: 'success',
    title: '', description: '', parameters: '', date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-800">Log New Change</h3>
        <button onClick={onCancel}><XCircle className="text-slate-400 hover:text-slate-600" /></button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server Name</label>
            <input required type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Web-Prod-01" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Application (Optional)</label>
            <input type="text" value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Nginx" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Change Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option>Update</option><option>Patch</option><option>Config Change</option><option>Reboot</option><option>Deployment</option><option>Hardware</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="success">Success</option><option value="pending">Pending</option><option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title / Summary</label>
          <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Brief summary of change" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Detailed Description</label>
          <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Steps taken, reasons, etc." />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parameters Changed (Key:Value)</label>
          <textarea rows="2" value={formData.parameters} onChange={e => setFormData({...formData, parameters: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs bg-slate-50" placeholder="e.g. worker_processes: 4; timeout: 30s" />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">Record Change</button>
        </div>
      </form>
    </div>
  );
};

export default ChangeForm;
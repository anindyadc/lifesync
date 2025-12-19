import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, Plus, FileText, Download, Loader2, X, Save 
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../lib/utils';

// Modular Imports
import StatSummary from './components/StatSummary';
import IncidentCard from './components/IncidentCard';
import ResolveModal from './components/ResolveModal';

/**
 * IncidentLoggerApp
 * Restored to original layout with added Edit functionality for resolved tickets.
 */
const IncidentLoggerApp = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'log'
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open'); 

  // Form State
  const [formData, setFormData] = useState({
    title: '', serverName: '', application: '', priority: 'medium',
    issueDescription: '', reportedBy: '', dateReported: new Date().toISOString().split('T')[0],
    fixProvided: '', status: 'open'
  });

  const APP_ID = 'default-app-id';

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        const dateA = a.dateReported?.toDate ? a.dateReported.toDate() : new Date(a.dateReported);
        const dateB = b.dateReported?.toDate ? b.dateReported.toDate() : new Date(b.dateReported);
        return dateB - dateA;
      });
      setIncidents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleEdit = (incident) => {
    const d = incident.dateReported?.toDate ? incident.dateReported.toDate() : new Date(incident.dateReported);
    setFormData({
      title: incident.title || '',
      serverName: incident.serverName || '',
      application: incident.application || '',
      priority: incident.priority || 'medium',
      issueDescription: incident.issueDescription || '',
      reportedBy: incident.reportedBy || '',
      dateReported: d.toISOString().split('T')[0],
      fixProvided: incident.fixProvided || '',
      status: incident.status || 'open'
    });
    setEditingIncident(incident);
    setView('log');
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    const tsDate = new Date(formData.dateReported);
    const payload = {
      ...formData,
      dateReported: Timestamp.fromDate(tsDate),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents');

    if (editingIncident) {
      await updateDoc(doc(colRef, editingIncident.id), payload);
    } else {
      await addDoc(colRef, {
        ...payload,
        createdAt: serverTimestamp(),
        status: 'open'
      });
    }

    resetForm();
    setView('dashboard');
  };

  const handleResolve = async (id, fix) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents', id), {
      status: 'resolved',
      fixProvided: fix,
      resolvedBy: user.displayName || user.email,
      resolvedDate: serverTimestamp()
    });
    setResolvingIncident(null);
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({
      title: '', serverName: '', application: '', priority: 'medium',
      issueDescription: '', reportedBy: '', dateReported: new Date().toISOString().split('T')[0],
      fixProvided: '', status: 'open'
    });
  };

  const filteredIncidents = useMemo(() => {
    if (filterStatus === 'all') return incidents;
    return incidents.filter(i => i.status === filterStatus);
  }, [incidents, filterStatus]);

  // Export placeholders for completeness
  const exportPDF = () => { console.log("Exporting PDF..."); };
  const exportCSV = () => { console.log("Exporting CSV..."); };

  return (
    <div className="space-y-6">
      <ResolveModal 
        incident={resolvingIncident} 
        onClose={() => setResolvingIncident(null)} 
        onConfirm={handleResolve} 
      />

      {/* Header Layout Restoration */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-red-50 p-2 rounded-lg text-red-600"><ShieldAlert size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800">Incident Logger</h2>
            <p className="text-xs text-slate-500">Track & Resolve System Issues</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg"><Download size={18}/></button>
          <button 
            onClick={() => { resetForm(); setView('log'); }} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={16}/> Report Incident
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>
      ) : (
        <>
          {view === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <StatSummary incidents={incidents} />

              <div className="flex gap-2">
                {['open', 'resolved', 'all'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIncidents.map(incident => (
                  <IncidentCard 
                    key={incident.id} 
                    incident={incident} 
                    onResolve={setResolvingIncident}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          )}

          {view === 'log' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800">{editingIncident ? 'Edit Incident' : 'Report New Incident'}</h3>
                <button onClick={() => setView('dashboard')} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
                  <X className="text-slate-400 hover:text-slate-600" size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveIncident} className="space-y-5">
                {/* Restore standard input styling */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Title</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
                    placeholder="Brief description of the error"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server Name</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.serverName} 
                      onChange={e => setFormData({...formData, serverName: e.target.value})} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
                      placeholder="e.g. Production-DB"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Application</label>
                    <input 
                      type="text" 
                      value={formData.application} 
                      onChange={e => setFormData({...formData, application: e.target.value})} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
                      placeholder="e.g. ERP System"
                    />
                  </div>
                </div>

                {editingIncident && (
                   <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none text-sm font-medium"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select 
                      value={formData.priority} 
                      onChange={e => setFormData({...formData, priority: e.target.value})} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none text-sm font-medium"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Reported</label>
                    <input 
                      type="date" 
                      value={formData.dateReported} 
                      onChange={e => setFormData({...formData, dateReported: e.target.value})} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm font-medium" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Description</label>
                  <textarea 
                    required 
                    rows="4" 
                    value={formData.issueDescription} 
                    onChange={e => setFormData({...formData, issueDescription: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none resize-none text-sm font-medium" 
                    placeholder="Details about the incident..."
                  />
                </div>

                {formData.status === 'resolved' && (
                  <div className="animate-in slide-in-from-top-2 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Resolution / Fix Provided</label>
                    <textarea 
                      rows="3" 
                      value={formData.fixProvided} 
                      onChange={e => setFormData({...formData, fixProvided: e.target.value})} 
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg outline-none resize-none text-sm font-medium bg-white" 
                      placeholder="Describe the solution applied..."
                    />
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setView('dashboard')} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Save size={16}/>
                    {editingIncident ? 'Update Ticket' : 'Log Incident'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IncidentLoggerApp;

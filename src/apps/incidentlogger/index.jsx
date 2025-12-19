import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, Plus, FileText, Download, Loader2, X, Save,
  AlertOctagon, AlertTriangle, CheckCircle, Pencil, Server, Laptop, Calendar 
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp, query 
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

// Local Modular Imports
import { db, auth, appId } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';

/**
 * INLINED COMPONENTS
 * Kept inlined for easier management of the expanded detail view 
 * within the main dashboard context.
 */

const StatSummary = ({ incidents = [] }) => {
  const stats = useMemo(() => ({
    open: incidents.filter(i => i.status === 'open').length,
    critical: incidents.filter(i => i.status === 'open' && i.priority === 'critical').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  }), [incidents]);

  const cards = [
    { label: 'Open Incidents', count: stats.open, icon: <AlertOctagon size={24} />, textColor: 'text-slate-800', iconColor: 'text-red-600', bgColor: 'bg-red-100' },
    { label: 'Critical Open', count: stats.critical, icon: <AlertTriangle size={24} />, textColor: 'text-red-600', iconColor: 'text-orange-600', bgColor: 'bg-orange-100' },
    { label: 'Total Resolved', count: stats.resolved, icon: <CheckCircle size={24} />, textColor: 'text-emerald-600', iconColor: 'text-emerald-600', bgColor: 'bg-emerald-100' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((s, idx) => (
        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">{s.label}</p>
            <h3 className={`text-2xl font-bold mt-0.5 ${s.textColor}`}>{s.count}</h3>
          </div>
          <div className={`${s.bgColor} ${s.iconColor} p-3 rounded-full`}>{s.icon}</div>
        </div>
      ))}
    </div>
  );
};

const IncidentCard = ({ incident, onResolve, onEdit }) => {
  const priorityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
      {incident.status === 'open' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[incident.priority] || priorityColors.low}`}>
            {incident.priority}
          </span>
          <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
            <Calendar size={12} />
            {formatDate(incident.dateReported)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onEdit(incident)}
            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Edit Details"
          >
            <Pencil size={16} />
          </button>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
            incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
          }`}>
            {incident.status === 'resolved' ? <CheckCircle size={10} /> : <AlertOctagon size={10} />}
            {incident.status === 'resolved' ? 'Resolved' : 'Open'}
          </span>
        </div>
      </div>

      <h4 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{incident.title}</h4>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[10px] font-bold text-slate-600">
          <Server size={12} className="text-slate-400" />
          {incident.serverName}
        </div>
        {incident.application && (
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[10px] font-bold text-slate-600">
            <Laptop size={12} className="text-slate-400" />
            {incident.application}
          </div>
        )}
      </div>

      <div className="flex-grow">
        <div className="text-sm text-slate-600 mb-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
          {incident.issueDescription}
        </div>
      </div>

      <div className="mt-auto">
        {incident.status === 'resolved' ? (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-emerald-700 mb-1 uppercase tracking-tight">✓ Fix Provided:</p>
            <div className="text-sm text-slate-600 p-3 bg-emerald-50/30 rounded-lg border border-emerald-100 leading-relaxed italic">
              {incident.fixProvided || 'No resolution details provided.'}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onResolve(incident)}
            className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={14} /> Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
};

const ResolveModal = ({ incident, onClose, onConfirm }) => {
  const [fix, setFix] = useState('');
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" /> Resolve Incident
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onConfirm(incident.id, fix); }}>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resolution / Fix Provided</label>
          <textarea 
            required autoFocus rows="4" value={fix} onChange={(e) => setFix(e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800 resize-none bg-white" 
          />
          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={!fix.trim()} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95">Confirm Fix</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * MAIN APP COMPONENT
 */
const IncidentLoggerApp = () => {
  const [user, setUser] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open'); 

  const [formData, setFormData] = useState({
    title: '', serverName: '', application: '', priority: 'medium',
    issueDescription: '', reportedBy: '', dateReported: new Date().toISOString().split('T')[0],
    fixProvided: '', status: 'open'
  });

  // Authentication Setup (Modular Style)
  useEffect(() => {
    const initAuth = async () => {
      // In local deployment, we rely on the logic in firebase.js
      // but we maintain the listener here to set local user state.
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
    };
    initAuth();
  }, []);

  // Data Subscription
  useEffect(() => {
    if (!user) return;
    const incidentsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'incidents');
    const q = query(incidentsCol);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        const da = a.dateReported?.toDate ? a.dateReported.toDate() : new Date(a.dateReported);
        const db = b.dateReported?.toDate ? b.dateReported.toDate() : new Date(b.dateReported);
        return db - da;
      });
      setIncidents(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
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
    if (!user) return;
    const tsDate = new Date(formData.dateReported);
    const payload = {
      ...formData,
      dateReported: Timestamp.fromDate(tsDate),
      updatedAt: serverTimestamp(),
    };

    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'incidents');

    try {
      if (editingIncident) {
        await updateDoc(doc(colRef, editingIncident.id), payload);
      } else {
        await addDoc(colRef, { ...payload, createdAt: serverTimestamp(), status: 'open' });
      }
      resetForm();
      setView('dashboard');
    } catch (err) {
      console.error("Save Error:", err);
    }
  };

  const handleResolve = async (id, fix) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'incidents', id), {
        status: 'resolved',
        fixProvided: fix,
        resolvedBy: user.displayName || user.email || 'System User',
        resolvedDate: serverTimestamp()
      });
      setResolvingIncident(null);
    } catch (err) {
      console.error("Resolve Error:", err);
    }
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-4 font-sans">
      <ResolveModal 
        incident={resolvingIncident} 
        onClose={() => setResolvingIncident(null)} 
        onConfirm={handleResolve} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-red-50 p-2 rounded-lg text-red-600"><ShieldAlert size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800 leading-none">Incident Logger</h2>
            <p className="text-xs text-slate-500 mt-1">Track & Resolve System Issues</p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setView('log'); }} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <Plus size={16}/> Report Incident
        </button>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
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

          {/* DASHBOARD: Expanded 2-column layout for bigger details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIncidents.map(incident => (
              <IncidentCard 
                key={incident.id} 
                incident={incident} 
                onResolve={setResolvingIncident}
                onEdit={handleEdit}
              />
            ))}
            {filteredIncidents.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                No incidents to display.
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'log' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">{editingIncident ? 'Edit Incident' : 'Report New Incident'}</h3>
            <button onClick={() => setView('dashboard')} className="p-1 hover:bg-slate-50 rounded-lg transition-colors"><X className="text-slate-400" /></button>
          </div>
          
          <form onSubmit={handleSaveIncident} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Title</label>
              <input 
                required 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-white" 
                placeholder="Brief summary of the issue"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Application</label>
                <input 
                  type="text" 
                  value={formData.application} 
                  onChange={e => setFormData({...formData, application: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-white" 
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm font-medium bg-white" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Description</label>
              <textarea 
                required 
                rows="5" 
                value={formData.issueDescription} 
                onChange={e => setFormData({...formData, issueDescription: e.target.value})} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none resize-none text-sm font-medium bg-white leading-relaxed" 
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
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <Save size={16}/> {editingIncident ? 'Update Ticket' : 'Log Incident'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default IncidentLoggerApp;

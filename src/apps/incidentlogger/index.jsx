import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertOctagon, CheckCircle, Clock, Plus, Search, FileText, Download, 
  Filter, X, AlertTriangle, ArrowRight, Loader2, ShieldAlert 
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---

const StatusBadge = ({ status }) => {
  if (status === 'resolved') return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle size={10} /> Resolved</span>;
  return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse"><AlertOctagon size={10} /> Open</span>;
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white'
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colors[priority] || colors.low}`}>{priority}</span>;
};

const IncidentCard = ({ incident, onResolve }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
    {incident.status === 'open' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
    
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <PriorityBadge priority={incident.priority} />
        <span className="text-xs text-slate-400 font-mono">{formatDate(incident.dateReported)}</span>
      </div>
      <StatusBadge status={incident.status} />
    </div>

    <h4 className="font-bold text-slate-800 mb-1">{incident.title}</h4>
    <div className="text-xs text-slate-500 mb-4 flex gap-2">
      <span className="bg-slate-100 px-2 py-0.5 rounded">Server: {incident.serverName}</span>
      {incident.application && <span className="bg-slate-100 px-2 py-0.5 rounded">App: {incident.application}</span>}
    </div>

    <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
      {incident.issueDescription}
    </p>

    {incident.status === 'resolved' ? (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs font-bold text-emerald-700 mb-1">✓ Fix Provided:</p>
        <p className="text-sm text-slate-600">{incident.fixProvided}</p>
        <p className="text-[10px] text-slate-400 mt-2 text-right">Resolved by: {incident.resolvedBy || 'Admin'}</p>
      </div>
    ) : (
      <button 
        onClick={() => onResolve(incident)}
        className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle size={16} /> Mark Resolved
      </button>
    )}
  </div>
);

const ResolveModal = ({ incident, onClose, onConfirm }) => {
  const [fix, setFix] = useState('');
  
  if (!incident) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2"><ShieldAlert size={20}/> Resolve Incident</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Issue</p>
            <p className="text-sm text-slate-800 font-medium">{incident.title}</p>
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Resolution / Fix Provided</label>
          <textarea 
            rows="4" 
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="Describe steps taken to resolve..."
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            autoFocus
          ></textarea>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button 
              disabled={!fix.trim()}
              onClick={() => onConfirm(incident.id, fix)} 
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resolve Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const IncidentLoggerApp = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'log'
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open'); // 'all', 'open', 'resolved'

  // Form State
  const [formData, setFormData] = useState({
    title: '', serverName: '', application: '', priority: 'medium',
    issueDescription: '', reportedBy: '', dateReported: new Date().toISOString().split('T')[0]
  });

  const APP_ID = 'default-app-id';

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort: Open first, then by date desc
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

  const filteredIncidents = useMemo(() => {
    if (filterStatus === 'all') return incidents;
    return incidents.filter(i => i.status === filterStatus);
  }, [incidents, filterStatus]);

  const stats = useMemo(() => {
    return {
      open: incidents.filter(i => i.status === 'open').length,
      critical: incidents.filter(i => i.status === 'open' && i.priority === 'critical').length,
      resolved: incidents.filter(i => i.status === 'resolved').length
    };
  }, [incidents]);

  // Actions
  const handleLogIncident = async (e) => {
    e.preventDefault();
    const tsDate = new Date(formData.dateReported);
    const payload = {
      ...formData,
      status: 'open',
      dateReported: Timestamp.fromDate(tsDate),
      createdAt: serverTimestamp(),
      fixProvided: null,
      resolvedDate: null
    };
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents'), payload);
    setFormData({
      title: '', serverName: '', application: '', priority: 'medium',
      issueDescription: '', reportedBy: '', dateReported: new Date().toISOString().split('T')[0]
    });
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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Incident Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Priority', 'Server', 'Title', 'Status', 'Fix']],
      body: filteredIncidents.map(i => [
        formatDate(i.dateReported),
        i.priority.toUpperCase(),
        i.serverName,
        i.title,
        i.status.toUpperCase(),
        i.fixProvided || '-'
      ]),
    });
    doc.save("incidents_report.pdf");
  };

  const exportCSV = () => {
    const headers = ['Date', 'Server', 'App', 'Priority', 'Title', 'Issue', 'Status', 'Fix', 'Reported By'];
    const rows = filteredIncidents.map(i => [
      formatDate(i.dateReported), i.serverName, i.application, i.priority,
      `"${i.title}"`, `"${i.issueDescription}"`, i.status, `"${i.fixProvided || ''}"`, i.reportedBy
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "incidents_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
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
            <h2 className="font-bold text-slate-800">Incident Logger</h2>
            <p className="text-xs text-slate-500">Track & Resolve System Issues</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg" title="CSV"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg" title="PDF"><Download size={18}/></button>
          <button onClick={() => setView('log')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"><Plus size={16}/> Report Incident</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div> : (
        <>
          {view === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-slate-500 uppercase font-bold">Open Incidents</p><h3 className="text-2xl font-bold text-slate-800">{stats.open}</h3></div>
                  <div className="bg-red-100 p-3 rounded-full text-red-600"><AlertOctagon size={24}/></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-slate-500 uppercase font-bold">Critical Open</p><h3 className="text-2xl font-bold text-red-600">{stats.critical}</h3></div>
                  <div className="bg-orange-100 p-3 rounded-full text-orange-600"><AlertTriangle size={24}/></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div><p className="text-xs text-slate-500 uppercase font-bold">Total Resolved</p><h3 className="text-2xl font-bold text-emerald-600">{stats.resolved}</h3></div>
                  <div className="bg-emerald-100 p-3 rounded-full text-emerald-600"><CheckCircle size={24}/></div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                {['open', 'resolved', 'all'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIncidents.length > 0 ? (
                  filteredIncidents.map(incident => (
                    <IncidentCard key={incident.id} incident={incident} onResolve={setResolvingIncident} />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    No incidents found.
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'log' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800">Report New Incident</h3>
                <button onClick={() => setView('dashboard')}><X className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <form onSubmit={handleLogIncident} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. DB Connection Timeout" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server Name</label>
                    <input required type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Web-01" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Application</label>
                    <input type="text" value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. API Gateway" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Reported</label>
                    <input type="date" value={formData.dateReported} onChange={e => setFormData({...formData, dateReported: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reported By</label>
                  <input type="text" value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Name of reporter" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Description</label>
                  <textarea required rows="4" value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Detailed description of the issue..." />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setView('dashboard')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md">Log Incident</button>
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

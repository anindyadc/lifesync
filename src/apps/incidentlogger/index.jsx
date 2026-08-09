import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Plus, FileText, Download, Loader2, X, Save, Search, XCircle, LayoutGrid, List } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { safeGetDate, toISODate } from '../../lib/utils';

// Modular Imports
import StatSummary from './components/StatSummary';
import IncidentCard from './components/IncidentCard';
import IncidentRow from './components/IncidentRow';
import ResolveModal from './components/ResolveModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useIncidentExport } from './hooks/useIncidentExport';

const VIEW_MODE_KEY = 'incidentlogger-incidentlist-view-mode';

const IncidentLoggerApp = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);
  const [deletingIncidentId, setDeletingIncidentId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  // Persisted across visits, same convention as WalletWatch's History / TaskFlow's My
  // Tasks / ChangeManager's list view toggle.
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'card';
    } catch {
      return 'card';
    }
  });

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* ignore (private browsing, etc.) */ }
  };

  const [formData, setFormData] = useState({
    title: '', serverName: '', application: '', priority: 'medium',
    issueDescription: '', reportedBy: '', dateReported: toISODate(new Date()),
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
        return (safeGetDate(b.dateReported) || 0) - (safeGetDate(a.dateReported) || 0);
      });
      setIncidents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleEdit = (incident) => {
    setFormData({
      title: incident.title || '', serverName: incident.serverName || '',
      application: incident.application || '', priority: incident.priority || 'medium',
      issueDescription: incident.issueDescription || '', reportedBy: incident.reportedBy || '',
      dateReported: toISODate(safeGetDate(incident.dateReported)) || toISODate(new Date()),
      fixProvided: incident.fixProvided || '',
      status: incident.status || 'open'
    });
    setEditingIncident(incident);
    setView('log');
  };

  const handleDelete = (id) => {
    setDeletingIncidentId(id);
  };

  const confirmDelete = async () => {
    if (!deletingIncidentId) return;
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents', deletingIncidentId);
      await deleteDoc(docRef);
      setDeletingIncidentId(null);
      setDeleteError('');
    } catch (error) {
      console.error("Error deleting incident: ", error);
      setDeleteError(error?.message || 'Could not delete this incident — please try again.');
    }
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    const tsDate = safeGetDate(formData.dateReported) || new Date();
    const payload = { ...formData, dateReported: Timestamp.fromDate(tsDate), updatedAt: serverTimestamp() };
    const colRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents');

    if (editingIncident) await updateDoc(doc(colRef, editingIncident.id), payload);
    else await addDoc(colRef, { ...payload, createdAt: serverTimestamp(), status: 'open' });

    resetForm();
    setView('dashboard');
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({
      title: '', serverName: '', application: '', priority: 'medium',
      issueDescription: '', reportedBy: '', dateReported: toISODate(new Date()),
      fixProvided: '', status: 'open'
    });
  };

  const filteredIncidents = useMemo(() => {
    let result = filterStatus === 'all' ? incidents : incidents.filter(i => i.status === filterStatus);
    if (filterPriority) result = result.filter(i => i.priority === filterPriority);
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(term) ||
        i.issueDescription?.toLowerCase().includes(term) ||
        i.serverName?.toLowerCase().includes(term) ||
        i.application?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [incidents, filterStatus, filterPriority, filterSearch]);

  const toggleCriticalFilter = () => {
    setFilterPriority(prev => prev === 'critical' ? '' : 'critical');
  };

  const { exportPDF, exportCSV } = useIncidentExport(filteredIncidents);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      <ResolveModal
        incident={resolvingIncident}
        onClose={() => setResolvingIncident(null)}
        onConfirm={async (id, fix) => {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'incidents', id), {
            status: 'resolved', fixProvided: fix, resolvedBy: user.displayName || user.email, resolvedDate: serverTimestamp()
          });
          setResolvingIncident(null);
        }}
      />

      <ConfirmModal
        isOpen={!!deletingIncidentId}
        title="Delete Incident"
        message="Are you sure you want to permanently delete this incident? This cannot be undone."
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => { setDeletingIncidentId(null); setDeleteError(''); }}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-red-50 p-2 rounded-lg text-red-600"><ShieldAlert size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800">Incident Logger</h2>
            <p className="text-xs text-slate-500">Track & Resolve System Issues</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search title, description, server, app..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              aria-label="Search incidents by title, description, server, or application"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XCircle size={14} />
              </button>
            )}
          </div>
          <button onClick={exportCSV} aria-label="Export CSV" title="Export CSV" className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm"><FileText size={18}/></button>
          <button onClick={exportPDF} aria-label="Export PDF" title="Export PDF" className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm"><Download size={18}/></button>
          <button
            onClick={() => { resetForm(); setView('log'); }}
            aria-label="Report new incident"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={16}/> Report Incident
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" size={40}/></div> : (
        <>
          {view === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <StatSummary
                incidents={incidents}
                onCriticalClick={toggleCriticalFilter}
                isCriticalFilterActive={filterPriority === 'critical'}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {['open', 'resolved', 'all'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {status}
                    </button>
                  ))}
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 outline-none cursor-pointer"
                    aria-label="Filter by priority"
                  >
                    <option value="">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => changeViewMode('card')}
                    aria-label="Card view"
                    title="Card view"
                    aria-pressed={viewMode === 'card'}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <LayoutGrid size={15}/>
                  </button>
                  <button
                    onClick={() => changeViewMode('list')}
                    aria-label="List view"
                    title="List view"
                    aria-pressed={viewMode === 'list'}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <List size={15}/>
                  </button>
                </div>
              </div>

              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredIncidents.map(incident => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      onResolve={setResolvingIncident}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                  {filteredIncidents.map(incident => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      onResolve={setResolvingIncident}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {filteredIncidents.length === 0 && (
                <div className="py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  No incidents found matching your criteria.
                </div>
              )}
            </div>
          )}

          {view === 'log' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800">{editingIncident ? 'Edit Incident' : 'Report New Incident'}</h3>
                <button onClick={() => setView('dashboard')}><X className="text-slate-400 hover:text-slate-600" size={20} /></button>
              </div>

              <form onSubmit={handleSaveIncident} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Brief summary" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server Name</label>
                    <input required type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Application</label>
                    <input type="text" value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reported By</label>
                    <input required type="text" value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Name or ID" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Reported</label>
                    <input type="date" value={formData.dateReported} onChange={e => setFormData({...formData, dateReported: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none text-sm font-medium">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  {editingIncident && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none text-sm font-medium">
                        <option value="open">Open</option><option value="resolved">Resolved</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Description</label>
                  <textarea required rows="4" value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none resize-none text-sm font-medium leading-relaxed" />
                </div>

                {formData.status === 'resolved' && (
                  <div className="animate-in slide-in-from-top-2 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Resolution / Fix Provided</label>
                    <textarea rows="3" value={formData.fixProvided} onChange={e => setFormData({...formData, fixProvided: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg outline-none resize-none text-sm font-medium bg-white" placeholder="Solution applied..." />
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setView('dashboard')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md font-bold text-sm flex items-center gap-2 transition-all active:scale-95">
                    <Save size={16}/> {editingIncident ? 'Update Ticket' : 'Log Incident'}
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

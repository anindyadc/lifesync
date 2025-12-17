import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, Activity, Plus, Search, FileText, Download, 
  Calendar, CheckCircle, AlertTriangle, XCircle, Clock, 
  Filter, ChevronRight, Loader2, History
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---
const ChangeCard = ({ change, onClick }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Server size={18} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{change.serverName}</h4>
            <p className="text-xs text-slate-500">{change.application || 'System'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(change.status)}`}>
          {change.status}
        </span>
      </div>
      <h5 className="font-medium text-slate-900 text-sm mb-1">{change.title}</h5>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{change.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(change.date)}</span>
        <span className="flex items-center gap-1"><Activity size={12}/> {change.type}</span>
      </div>
    </div>
  );
};

const TimelineItem = ({ change, isLast }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={`w-3 h-3 rounded-full mt-1.5 ${change.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>}
    </div>
    <div className="pb-8 flex-1">
      <p className="text-xs text-slate-400 font-mono mb-1">{formatDate(change.date)}</p>
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-slate-800 text-sm">{change.title}</h4>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">{change.type}</span>
        </div>
        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{change.description}</p>
        {change.parameters && (
          <div className="mt-3 bg-slate-50 p-2 rounded text-xs font-mono text-slate-600 border border-slate-200">
            {change.parameters}
          </div>
        )}
        <div className="mt-2 text-xs text-slate-400">
          Performed by: <span className="font-medium text-slate-600">{change.performedBy || 'Admin'}</span>
        </div>
      </div>
    </div>
  </div>
);

const ChangeManagerApp = ({ user }) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'timeline'
  const [filterServer, setFilterServer] = useState('');
  const [selectedServerData, setSelectedServerData] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    serverName: '', application: '', type: 'Update', status: 'success',
    title: '', description: '', parameters: '', date: new Date().toISOString().split('T')[0]
  });

  const APP_ID = 'default-app-id';

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date desc
      data.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      setChanges(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Derived State
  const uniqueServers = useMemo(() => [...new Set(changes.map(c => c.serverName))], [changes]);
  
  const filteredChanges = useMemo(() => {
    if (!filterServer) return changes;
    return changes.filter(c => 
      c.serverName.toLowerCase().includes(filterServer.toLowerCase()) || 
      c.application?.toLowerCase().includes(filterServer.toLowerCase())
    );
  }, [changes, filterServer]);

  // Actions
  const handleSave = async (e) => {
    e.preventDefault();
    const tsDate = new Date(formData.date);
    const payload = {
      ...formData,
      date: Timestamp.fromDate(tsDate),
      performedBy: user.displayName || user.email,
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'changelogs'), payload);
    setFormData({
      serverName: '', application: '', type: 'Update', status: 'success',
      title: '', description: '', parameters: '', date: new Date().toISOString().split('T')[0]
    });
    setView('list');
  };

  const handleServerClick = (serverName) => {
    setFilterServer(serverName);
    setView('timeline');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Change Management Report`, 14, 20);
    if (filterServer) doc.text(`Server: ${filterServer}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Server', 'App', 'Type', 'Title', 'Status']],
      body: filteredChanges.map(c => [
        formatDate(c.date),
        c.serverName,
        c.application,
        c.type,
        c.title,
        c.status
      ]),
    });
    doc.save('changelog_report.pdf');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Server', 'Application', 'Type', 'Title', 'Description', 'Parameters', 'Status'];
    const rows = filteredChanges.map(c => [
      formatDate(c.date), c.serverName, c.application, c.type, 
      `"${c.title}"`, `"${c.description}"`, `"${c.parameters}"`, c.status
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "changelog_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Server size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800">ServerLog</h2>
            <p className="text-xs text-slate-500">Track Infrastructure Changes</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search server or app..." 
              value={filterServer}
              onChange={(e) => setFilterServer(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {filterServer && (
              <button onClick={() => { setFilterServer(''); setView('list'); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XCircle size={14} />
              </button>
            )}
          </div>
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg" title="CSV"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg" title="PDF"><Download size={18}/></button>
          <button onClick={() => setView('add')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Plus size={16}/> Log Change</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>
      ) : (
        <>
          {/* VIEW: LIST (Dashboard) */}
          {view === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredChanges.length > 0 ? (
                  filteredChanges.map(change => (
                    <ChangeCard key={change.id} change={change} onClick={() => handleServerClick(change.serverName)} />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    No changes found matching your criteria.
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Filter size={16}/> Servers</h3>
                  <div className="flex flex-wrap gap-2">
                    {uniqueServers.slice(0, 10).map(server => (
                      <button 
                        key={server}
                        onClick={() => handleServerClick(server)}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded transition-colors"
                      >
                        {server}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-2">Stats</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Total Changes</span><span className="font-bold">{changes.length}</span></div>
                    <div className="flex justify-between"><span>Servers Managed</span><span className="font-bold">{uniqueServers.length}</span></div>
                    <div className="flex justify-between"><span>Failed Changes</span><span className="font-bold text-red-500">{changes.filter(c => c.status === 'failed').length}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: TIMELINE (Chronological) */}
          {view === 'timeline' && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <History size={24} className="text-indigo-600"/> Change History: {filterServer || 'All'}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Chronological record of modifications</p>
                </div>
                <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-indigo-600 font-medium">Back to Dashboard</button>
              </div>
              
              <div className="max-w-3xl mx-auto">
                {filteredChanges.length > 0 ? (
                  filteredChanges.map((change, index) => (
                    <TimelineItem 
                      key={change.id} 
                      change={change} 
                      isLast={index === filteredChanges.length - 1} 
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">No history found for this selection.</div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: ADD FORM */}
          {view === 'add' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800">Log New Change</h3>
                <button onClick={() => setView('list')}><XCircle className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-5">
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
                  <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">Record Change</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChangeManagerApp;

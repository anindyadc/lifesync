import React, { useState, useMemo } from 'react';
import { 
  Server, Plus, Search, FileText, Download, XCircle, Loader2, History 
} from 'lucide-react';

// Hooks
import { useChanges } from './hooks/useChanges';
import { useChangeExport } from './hooks/useChangeExport';

// Components
import ChangeCard from './components/ChangeCard';
import TimelineItem from './components/TimelineItem';
import ChangeForm from './components/ChangeForm';
import ChangeStats from './components/ChangeStats';
import ServerFilter from './components/ServerFilter';

const ChangeManagerApp = ({ user }) => {
  // 1. Logic & Data Fetching
  const { changes, loading, addChange } = useChanges(user);
  
  // 2. Local UI State
  const [view, setView] = useState('list'); // 'list' | 'add' | 'timeline'
  const [filterServer, setFilterServer] = useState('');

  // 3. Derived State (Filtering)
  const uniqueServers = useMemo(() => 
    [...new Set(changes.map(c => c.serverName))], 
  [changes]);
  
  const filteredChanges = useMemo(() => {
    if (!filterServer) return changes;
    return changes.filter(c => 
      c.serverName.toLowerCase().includes(filterServer.toLowerCase()) || 
      (c.application && c.application.toLowerCase().includes(filterServer.toLowerCase()))
    );
  }, [changes, filterServer]);

  // Initialize Export Hook with filtered data
  const { exportPDF, exportCSV } = useChangeExport(filteredChanges, filterServer);

  // 4. Handlers
  const handleSave = async (data) => {
    await addChange(data);
    setView('list');
  };

  const handleServerClick = (serverName) => {
    setFilterServer(serverName);
    setView('timeline');
  };

  const clearFilter = () => {
    setFilterServer('');
    setView('list');
  };

  // 5. Render
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Server size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800">ChangeLog</h2>
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
              <button onClick={clearFilter} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XCircle size={14} />
              </button>
            )}
          </div>
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Export CSV"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Export PDF"><Download size={18}/></button>
          <button onClick={() => setView('add')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200"><Plus size={16}/> Log Change</button>
        </div>
      </div>

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
            <ServerFilter servers={uniqueServers} onSelect={handleServerClick} />
            <ChangeStats 
              totalChanges={changes.length} 
              uniqueServersCount={uniqueServers.length} 
              failedCount={changes.filter(c => c.status === 'failed').length} 
            />
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
        <ChangeForm 
          onSubmit={handleSave} 
          onCancel={() => setView('list')} 
        />
      )}
    </div>
  );
};

export default ChangeManagerApp;
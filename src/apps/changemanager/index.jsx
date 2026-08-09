import React, { useState, useMemo } from 'react';
import {
  Server, Plus, Search, FileText, Download, XCircle, Loader2, History,
  Archive, Eye, EyeOff, LayoutGrid, List
} from 'lucide-react';

// Hooks
import { useChanges } from './hooks/useChanges';
import { useChangeExport } from './hooks/useChangeExport';
import { safeGetDate, toISODate } from '../../lib/utils';

// Components
import ChangeCard from './components/ChangeCard';
import ChangeRow from './components/ChangeRow';
import TimelineItem from './components/TimelineItem';
import ChangeForm from './components/ChangeForm';
import ChangeStats from './components/ChangeStats';
import ChangeTypeChart from './components/ChangeTypeChart';
import ChangeStatusChart from './components/ChangeStatusChart';
import ActivityHeatmap from './components/ActivityHeatmap';
import ServerFilter from './components/ServerFilter';
import ConfirmModal from '../../components/ConfirmModal';

// Same fixed set as ChangeForm's Change Type <select> options.
const CHANGE_TYPES = ['Update', 'Patch', 'Config Change', 'Reboot', 'Deployment', 'Hardware'];
const VIEW_MODE_KEY = 'changemanager-changelist-view-mode';

const ChangeManagerApp = ({ user }) => {
  // 1. Logic & Data Fetching
  const { changes, loading, addChange, updateChange, deleteChange, archiveChange, unarchiveChange } = useChanges(user);

  // 2. Local UI State
  const [view, setView] = useState('list'); // 'list' | 'add' | 'timeline'
  const [filterServer, setFilterServer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [editingChange, setEditingChange] = useState(null);
  const [deletingChangeId, setDeletingChangeId] = useState(null);
  const [archivingChange, setArchivingChange] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  // Persisted across visits, same convention as TaskFlow's My Tasks / WalletWatch's History toggle.
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

  // 3. Derived State (Filtering)
  const activeChanges = useMemo(() => changes.filter(c => c.status !== 'archived'), [changes]);
  const archivedChanges = useMemo(() => changes.filter(c => c.status === 'archived'), [changes]);

  const uniqueServers = useMemo(() =>
    [...new Set(activeChanges.map(c => c.serverName))],
  [activeChanges]);

  const filteredChanges = useMemo(() => {
    // Picking the "Archived" status pill isolates just archived items regardless of the
    // showArchived eye toggle — previously the only way to see archived changes was that
    // toggle, which always mixed them (dimmed) into the same list rather than showing
    // just them.
    const source = (showArchived || filterStatus === 'archived') ? changes : activeChanges;
    let result = source;

    if (filterServer) {
      result = result.filter(c =>
        c.serverName.toLowerCase().includes(filterServer.toLowerCase()) ||
        (c.application && c.application.toLowerCase().includes(filterServer.toLowerCase()))
      );
    }

    if (filterStatus) {
      result = result.filter(c => c.status === filterStatus);
    }

    if (filterType) {
      result = result.filter(c => c.type === filterType);
    }

    if (dateRange.from || dateRange.to) {
      result = result.filter(c => {
        const changeDate = safeGetDate(c.date);
        if (!changeDate) return true;
        if (dateRange.from && changeDate < dateRange.from) return false;
        if (dateRange.to && changeDate > dateRange.to) return false;
        return true;
      });
    }

    return result;
  }, [changes, activeChanges, filterServer, filterStatus, filterType, showArchived, dateRange]);

  // Initialize Export Hook with filtered data
  const { exportPDF, exportCSV } = useChangeExport(filteredChanges, filterServer);

  // 4. Handlers
  const handleSave = async (data) => {
    if (editingChange) {
      await updateChange(editingChange.id, data);
      setEditingChange(null);
    } else {
      await addChange(data);
    }
    setView('list');
  };

  const handleEdit = (change) => {
    setEditingChange(change);
    setView('add');
  };

  const handleDeleteClick = (changeId) => {
    setDeletingChangeId(changeId);
  };

  const handleArchiveClick = (change) => {
    setArchivingChange(change);
  };

  const handleUnarchive = async (change) => {
    await unarchiveChange(change.id, change.previousStatus);
  };

  const confirmDelete = async () => {
    if (deletingChangeId) {
      await deleteChange(deletingChangeId);
      setDeletingChangeId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingChangeId(null);
  };

  const confirmArchive = async () => {
    if (archivingChange) {
      await archiveChange(archivingChange.id, archivingChange.status);
      setArchivingChange(null);
    }
  };

  const cancelArchive = () => {
    setArchivingChange(null);
  };

  const clearFilter = () => {
    setFilterServer('');
    setView('list');
  };

  const handleDateRangeChange = (field, value) => {
    const parsed = value ? safeGetDate(value) : null;
    if (parsed && field === 'to') {
      parsed.setHours(23, 59, 59, 999);
    }
    setDateRange(prev => ({ ...prev, [field]: parsed }));
  };

  const clearDateRange = () => setDateRange({ from: null, to: null });

  const handleServerClick = (serverName) => {
    setFilterServer(serverName);
    setView('timeline');
  };

  const toggleFailedFilter = () => {
    setFilterStatus(prev => prev === 'failed' ? '' : 'failed');
  };

  const hasStatusTypeFilters = !!(filterStatus || filterType);
  const clearStatusTypeFilters = () => {
    setFilterStatus('');
    setFilterType('');
  };

  const handleHeatmapDayClick = (date) => {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);
    setDateRange({ from, to });
    setView('list');
  };

  // 5. Render
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!deletingChangeId}
        title="Delete Change Log"
        message="Are you sure you want to permanently delete this change log entry? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ConfirmModal
        isOpen={!!archivingChange}
        title="Archive Change Log"
        message="Archive this change log entry? It will be hidden from the main view, but you can unarchive it later."
        onConfirm={confirmArchive}
        onCancel={cancelArchive}
      />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Server size={20}/></div>
          <div>
            <h2 className="font-bold text-slate-800">ChangeLog</h2>
            <p className="text-xs text-slate-500">Track Infrastructure Changes</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
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
              <button onClick={clearFilter} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear server search">
                <XCircle size={14} />
              </button>
            )}
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

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2">
            <input
              type="date"
              value={dateRange.from ? toISODate(dateRange.from) : ''}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
              className="py-2 bg-transparent text-xs text-slate-600 outline-none w-[120px]"
              aria-label="Filter from date"
            />
            <span className="text-slate-300 text-xs">-</span>
            <input
              type="date"
              value={dateRange.to ? toISODate(dateRange.to) : ''}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
              className="py-2 bg-transparent text-xs text-slate-600 outline-none w-[120px]"
              aria-label="Filter to date"
            />
            {(dateRange.from || dateRange.to) && (
              <button onClick={clearDateRange} className="text-slate-400 hover:text-slate-600" aria-label="Clear date filter">
                <XCircle size={14} />
              </button>
            )}
          </div>

          <button onClick={() => setShowArchived(!showArchived)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title={showArchived ? "Hide Archived" : "Show Archived"} aria-label={showArchived ? "Hide archived changes" : "Show archived changes"}>
            {showArchived ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Export CSV" aria-label="Export CSV"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" title="Export PDF" aria-label="Export PDF"><Download size={18}/></button>
          <button onClick={() => { setEditingChange(null); setView('add'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200"><Plus size={16}/> Log Change</button>
        </div>
      </div>

      {/* Status & Type Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="flex gap-1.5">
          {['', 'success', 'pending', 'failed', 'archived'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-2 py-1 rounded-lg capitalize font-semibold transition-colors ${filterStatus === s ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none cursor-pointer"
        >
          <option value="">All Types</option>
          {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {hasStatusTypeFilters && (
          <button
            onClick={clearStatusTypeFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            title="Clear status/type filters"
          >
            <XCircle size={14} /> Clear
          </button>
        )}
      </div>

      {/* VIEW: LIST (Dashboard) */}
      {view === 'list' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Bento row: heatmap paired with the two donut charts so the row's
              width is actually used instead of leaving the calendar's narrow
              grid stranded in an otherwise-empty full-width card. */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <ActivityHeatmap changes={activeChanges} onDayClick={handleHeatmapDayClick} />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ChangeStatusChart changes={activeChanges} />
              <ChangeTypeChart changes={activeChanges} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {filteredChanges.length > 0 ? (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredChanges.map(change => (
                      <ChangeCard
                        key={change.id}
                        change={change}
                        onClick={() => handleServerClick(change.serverName)}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onArchive={handleArchiveClick}
                        onUnarchive={handleUnarchive}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {filteredChanges.map(change => (
                      <ChangeRow
                        key={change.id}
                        change={change}
                        onClick={() => handleServerClick(change.serverName)}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onArchive={handleArchiveClick}
                        onUnarchive={handleUnarchive}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  No changes found matching your criteria.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <ServerFilter servers={uniqueServers} onSelect={handleServerClick} />
              <ChangeStats
                totalChanges={activeChanges.length}
                uniqueServersCount={uniqueServers.length}
                failedCount={activeChanges.filter(c => c.status === 'failed').length}
                archivedCount={archivedChanges.length}
                onFailedClick={toggleFailedFilter}
                isFailedFilterActive={filterStatus === 'failed'}
              />
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

      {/* VIEW: ADD/EDIT FORM */}
      {view === 'add' && (
        <ChangeForm
          initialData={editingChange}
          onSubmit={handleSave}
          onCancel={() => { setEditingChange(null); setView('list'); }}
        />
      )}
    </div>
  );
};

export default ChangeManagerApp;

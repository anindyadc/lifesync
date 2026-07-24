import React, { useState } from 'react';
import { Settings, Plus, X, Loader2, FileText, Download, Wallet } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Dashboard from './components/DashboardStats';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ConfirmModal from './components/ConfirmModal';
import MiscExpenseModal from './components/MiscExpenseModal';
import { useExpenses } from './hooks/useExpenses';
import { useExport } from './hooks/useExport';
import { useMiscExpenseDraft } from './hooks/useMiscExpenseDraft';

const WalletWatchApp = ({ user }) => {
  // Single source of truth for "which month am I looking at" — shared by the Dashboard's
  // stats/charts AND the header CSV/PDF export, so exporting always matches what's on
  // screen (previously the Dashboard tracked its own separate month, so the header
  // export silently ignored it and dumped every transaction ever logged).
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { expenses, allExpenses, categories, loading, addCategory, removeCategory } = useExpenses(user, 'default-app-id', selectedMonth);
  const { exportToCSV, exportToPDF, exporting } = useExport(expenses, categories, 'walletwatch-dashboard-charts');
  const { draftItems, addDraftItem, removeDraftItem, clearDraft } = useMiscExpenseDraft(user);

  const [view, setView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMiscOpen, setIsMiscOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [relatedTxn, setRelatedTxn] = useState(null);

  const APP_ID = 'default-app-id';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 text-sm font-medium italic">Syncing Wallet...</p>
      </div>
    );
  }
  const handleSave = async (formData, keepOpen = false) => {
    const col = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses');
    
    // Convert YYYY-MM-DD string to local midnight Date object
    const [year, month, day] = formData.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const finalAmount = formData.category === 'reimbursement' 
      ? Math.abs(Number(formData.amount)) 
      : -Math.abs(Number(formData.amount));

    const payload = {
      ...formData,
      amount: finalAmount,
      date: Timestamp.fromDate(localDate),
      updatedAt: serverTimestamp(),
      relatedId: relatedTxn ? relatedTxn.id : (formData.relatedId || null)
    };

    try {
      if (editingId) {
        await updateDoc(doc(col, editingId), payload);
      } else {
        await addDoc(col, { ...payload, createdAt: serverTimestamp() });
        if (relatedTxn) {
          await updateDoc(doc(col, relatedTxn.id), { reimbursementStatus: 'settled' });
        }
      }
      
      if (!keepOpen) {
        setEditingId(null);
        setRelatedTxn(null);
        setIsAddOpen(false);
      }
    } catch (error) {
      console.error("Save Error:", error);
    }
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setEditingId(null);
    setRelatedTxn(null);
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName);
      setNewCatName('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses', deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans pb-10">
      <ConfirmModal 
        isOpen={!!deleteId} 
        title="Delete Record" 
        message="Permanently remove this transaction? This will update your charts." 
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteId(null)} 
      />

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-slate-800">Manage Categories</h3>
              <button onClick={() => setIsSettingsOpen(false)} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20}/>
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-5">{categories.length} categories &middot; tap &times; to remove</p>

            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="New category..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium min-w-0"
              />
              <button onClick={handleAddCategory} aria-label="Add category" className="shrink-0 p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm active:scale-90 transition-all">
                <Plus size={18}/>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[110px]">{c.label}</span>
                  <button
                    onClick={() => removeCategory(c.id)}
                    aria-label={`Remove ${c.label}`}
                    title={`Remove ${c.label}`}
                    className="p-1 text-slate-300 group-hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="mt-6 w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-50 gap-3">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History
          </button>
        </div>
        <div className="flex gap-2 justify-end w-full sm:w-auto">
          {/* Scoped to the Dashboard tab's selected month — History has its own
              export buttons (in TransactionList) scoped to its filtered results,
              since the two views can show very different data. */}
          {view === 'dashboard' && (
            <>
              <button onClick={exportToCSV} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95" title="Export CSV">
                <FileText size={20}/>
              </button>
              <button onClick={exportToPDF} disabled={exporting} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50" title="Export PDF">
                {exporting ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>}
              </button>
            </>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
          >
            <Settings size={20}/>
          </button>
          <button
            onClick={() => setIsMiscOpen(true)}
            className="relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-100 transition-all active:scale-95"
            title="Misc Expenses — jot down small spends across the day, save later as one transaction"
          >
            <Wallet size={16} /> Misc
            {draftItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                {draftItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setEditingId(null); setRelatedTxn(null); setIsAddOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      <div className="min-h-[400px]" id="walletwatch-dashboard-charts">
        {view === 'dashboard' && (
          <Dashboard
            categories={categories}
            expenses={expenses}
            allExpenses={allExpenses}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {view === 'history' && (
          <TransactionList
            expenses={allExpenses}
            categories={categories}
            onEdit={(exp) => { setEditingId(exp.id); setRelatedTxn(null); setIsAddOpen(true); }}
            onSettle={(exp) => { setRelatedTxn(exp); setIsAddOpen(true); }}
            onDelete={setDeleteId}
          />
        )}
      </div>

      {isMiscOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center"
          onClick={() => setIsMiscOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MiscExpenseModal
              draftItems={draftItems}
              categories={categories}
              onAddItem={addDraftItem}
              onRemoveItem={removeDraftItem}
              onSaveAsTransaction={(payload) => handleSave(payload, false)}
              onDiscardAll={clearDraft}
              onCancel={() => setIsMiscOpen(false)}
            />
          </div>
        </div>
      )}

      {isAddOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center"
          onClick={closeAddModal}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <TransactionForm
              initialData={editingId ? allExpenses.find(e => e.id === editingId) : (relatedTxn ? { ...relatedTxn, description: `Refund: ${relatedTxn.description}`, category: 'reimbursement' } : null)}
              categories={categories}
              expenses={allExpenses}
              isSettling={!!relatedTxn}
              onSubmit={handleSave}
              onCancel={closeAddModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletWatchApp;

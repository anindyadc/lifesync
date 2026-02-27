import React, { useState } from 'react';
import { Settings, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Dashboard from './components/DashboardStats';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ConfirmModal from './components/ConfirmModal';
import { useExpenses } from './hooks/useExpenses';

const WalletWatchApp = ({ user }) => {
  const { expenses, categories, loading, addCategory, removeCategory } = useExpenses(user);
  
  const [view, setView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const handleSave = async (formData) => {
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
      
      setEditingId(null);
      setRelatedTxn(null);
      setView('dashboard');
    } catch (error) {
      console.error("Save Error:", error);
    }
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
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Labels</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24}/>
              </button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="New label..." 
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" 
              />
              <button onClick={handleAddCategory} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all">
                <Plus size={20}/>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group">
                  <span className="text-sm font-bold text-slate-700">{c.label}</span>
                  <button onClick={() => removeCategory(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="mt-8 w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-50 gap-2">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('dashboard')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setView('history')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History
          </button>
          <button 
            onClick={() => { setEditingId(null); setRelatedTxn(null); setView('add'); }} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'add' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)} 
          className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
        >
          <Settings size={20}/>
        </button>
      </div>

      <div className="min-h-[400px]">
        {view === 'dashboard' && <Dashboard user={user} categories={categories} />}

        {view === 'history' && (
          <TransactionList 
            expenses={expenses} 
            categories={categories} 
            onEdit={(exp) => { setEditingId(exp.id); setRelatedTxn(null); setView('add'); }} 
            onSettle={(exp) => { setRelatedTxn(exp); setView('add'); }}
            onDelete={setDeleteId} 
          />
        )}

        {view === 'add' && (
          <TransactionForm 
            initialData={editingId ? expenses.find(e => e.id === editingId) : (relatedTxn ? { ...relatedTxn, description: `Refund: ${relatedTxn.description}`, category: 'reimbursement' } : null)}
            categories={categories} 
            expenses={expenses}
            isSettling={!!relatedTxn}
            onSubmit={handleSave} 
            onCancel={() => setView('dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default WalletWatchApp;

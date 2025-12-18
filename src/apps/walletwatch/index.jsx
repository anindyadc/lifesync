import React, { useState } from 'react';
import { Settings, Plus, X, Trash2, LayoutGrid, LayoutList, Loader2, RefreshCcw, CreditCard } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

/** UTILS */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};
const formatDate = (dateField) => {
  const date = dateField?.toDate ? dateField.toDate() : new Date(dateField);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Modular Hooks & Components
import { useExpenses } from './hooks/useExpenses';
import { NetTrendGraph, WeeklyBarChart } from './components/OverviewCharts';
import { SummaryCards, CategoryDistribution, CategorySubtotals, GroupSubtotals } from './components/DashboardStats';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ConfirmModal from './components/ConfirmModal';

const WalletWatchApp = ({ user }) => {
  const { expenses, categories, loading, addCategory, removeCategory } = useExpenses(user);
  const [view, setView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [relatedTxn, setRelatedTxn] = useState(null);

  const APP_ID = 'default-app-id';

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-400 text-sm font-medium italic">Syncing Wallet...</p>
    </div>
  );

  const handleSave = async (formData) => {
    const col = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses');
    const finalAmount = relatedTxn ? -Math.abs(Number(formData.amount)) : Number(formData.amount);
    const payload = {
      ...formData,
      amount: finalAmount,
      date: Timestamp.fromDate(new Date(formData.date)),
      updatedAt: serverTimestamp(),
      relatedId: relatedTxn ? relatedTxn.id : (formData.relatedId || null)
    };

    if (editingId) await updateDoc(doc(col, editingId), payload);
    else {
      await addDoc(col, { ...payload, createdAt: serverTimestamp() });
      if (relatedTxn) await updateDoc(doc(col, relatedTxn.id), { reimbursementStatus: 'settled' });
    }
    setEditingId(null); setRelatedTxn(null); setView('dashboard');
  };

  const handleSettleRequest = (exp) => {
    setRelatedTxn(exp);
    setEditingId(null);
    setView('add');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans pb-10">
      <ConfirmModal isOpen={!!deleteId} title="Delete Record" onConfirm={() => setDeleteId(null)} onCancel={() => setDeleteId(null)} />

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
          <button onClick={() => setView('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
          <button onClick={() => { setEditingId(null); setRelatedTxn(null); setView('add'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'add' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Plus size={16} /> Add Entry</button>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all"><Settings size={20}/></button>
      </div>

      <div className="min-h-[400px]">
        {view === 'dashboard' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <SummaryCards expenses={expenses} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <NetTrendGraph expenses={expenses} />
                <WeeklyBarChart expenses={expenses} />
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Recent Activity</h3>
                    <button onClick={() => setView('history')} className="text-xs font-bold text-indigo-600 hover:underline tracking-tight">View Detailed History</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {expenses.slice(0, 5).map(exp => (
                      <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${categories.find(c=>c.id===exp.category)?.bg || 'bg-slate-100'}`}>
                            <CreditCard size={16} className="opacity-70" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{formatDate(exp.date)} {exp.group && `• ${exp.group}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-sm font-black ${exp.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(exp.amount)}</p>
                            {exp.reimbursementStatus === 'pending' && <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 rounded-full font-black uppercase">Lent</span>}
                          </div>
                          {exp.reimbursementStatus === 'pending' && (
                            <button onClick={() => handleSettleRequest(exp)} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all"><RefreshCcw size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <GroupSubtotals expenses={expenses} />
                <CategoryDistribution categories={categories} expenses={expenses} />
                <CategorySubtotals categories={categories} expenses={expenses} />
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <TransactionList expenses={expenses} categories={categories} onEdit={(exp) => { setEditingId(exp.id); setRelatedTxn(null); setView('add'); }} onSettle={handleSettleRequest} onDelete={setDeleteId} />
        )}

        {view === 'add' && (
          <TransactionForm 
            initialData={editingId ? expenses.find(e => e.id === editingId) : (relatedTxn ? { ...relatedTxn, description: `Refund: ${relatedTxn.description}`, category: 'reimbursement' } : null)}
            categories={categories} isSettling={!!relatedTxn} onSubmit={handleSave} 
          />
        )}
      </div>

      {/* Settings Modal (Categories) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Manage Labels</h3>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(newCatName)} placeholder="New label..." className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              <button onClick={() => { addCategory(newCatName); setNewCatName(''); }} className="p-3 bg-indigo-600 text-white rounded-xl"><Plus size={20}/></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-bold text-slate-700">{c.label}</span>
                  <button onClick={() => removeCategory(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="mt-8 w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletWatchApp;

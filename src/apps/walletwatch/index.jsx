import React, { useState, useMemo } from 'react';
import { Settings, Plus, X, Trash2, Loader2, RefreshCcw, CreditCard } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate } from '../../lib/utils';

// Modular Hooks & Components
import { useExpenses } from './hooks/useExpenses';
import { NetTrendGraph, WeeklyBarChart } from './components/OverviewCharts';
import { SummaryCards, CategoryDistribution, CategorySubtotals, GroupSubtotals } from './components/DashboardStats';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ConfirmModal from './components/ConfirmModal';

/**
 * WalletWatch Modular Entry Point
 * Fixes:
 * 1. Gear Button: Added settings modal and category management logic.
 * 2. Weekly Activity: Added local-midnight date parsing in handleSave to prevent chart mismatches.
 */
const WalletWatchApp = ({ user }) => {
  const { expenses, categories, loading, addCategory, removeCategory } = useExpenses(user);
  
  const [view, setView] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [relatedTxn, setRelatedTxn] = useState(null);

  const APP_ID = 'default-app-id';

  // Filter for current month's expenses for the dashboard
  const currentMonthExpenses = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return expenses.filter(expense => {
      let expenseDate;
      if (expense.date?.toDate) {
        expenseDate = expense.date.toDate();
      } else if (typeof expense.date === 'string') {
        expenseDate = new Date(expense.date);
      } else if (expense.date instanceof Date) {
        expenseDate = expense.date;
      } else {
        return false; // Skip if date is invalid or unexpected format
      }
      
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
  }, [expenses]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 text-sm font-medium italic">Syncing Wallet...</p>
      </div>
    );
  }

  /**
   * handleSave
   * Normalizes the date input to prevent timezone shifts (critical for charts).
   */
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

      {/* Settings Modal (Category Management) */}
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

      {/* Navigation Header */}
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
        {view === 'dashboard' && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <SummaryCards expenses={currentMonthExpenses} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <NetTrendGraph expenses={currentMonthExpenses} />
                <WeeklyBarChart expenses={currentMonthExpenses} />

                {/* Dashboard Recent Activity */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Recent Activity (Current Month)</h3>
                    <button onClick={() => setView('history')} className="text-xs font-bold text-indigo-600">See All</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {currentMonthExpenses.slice(0, 5).map(exp => (
                      <div key={exp.id} className="p-4 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100`}>
                            <CreditCard size={18} className="opacity-70" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{exp.description}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(exp.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-sm font-black ${exp.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(exp.amount)}</p>
                            {exp.reimbursementStatus === 'pending' && <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 rounded-full font-black uppercase">Lent</span>}
                          </div>
                          {exp.reimbursementStatus === 'pending' && (
                            <button onClick={() => { setRelatedTxn(exp); setView('add'); }} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"><RefreshCcw size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-6">
                <GroupSubtotals expenses={currentMonthExpenses} />
                <CategoryDistribution categories={categories} expenses={currentMonthExpenses} />
                <CategorySubtotals categories={categories} expenses={currentMonthExpenses} />
              </div>
            </div>
          </div>
        )}

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

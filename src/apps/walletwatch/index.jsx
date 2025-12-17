import React, { useState, useMemo } from 'react';
import { 
  Wallet, Plus, PieChart, LayoutList, Download, FileText, Loader2, X 
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

// Local Components
import DashboardStats from './components/DashboardStats';
import OverviewCharts from './components/OverviewCharts';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';

// Custom Hooks & Constants
import { useExpenses } from './hooks/useExpenses';
import { useExport } from './hooks/useExport';
import { CATEGORIES } from './constants';

const WalletWatchApp = ({ user }) => {
  // 1. Initialize Hooks
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(user);
  const { exportToCSV, exportToPDF, exporting } = useExport(expenses, 'walletwatch-dashboard-charts');
  
  // 2. Local UI State
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'add'
  const [deleteId, setDeleteId] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 3. Derived State (Calculations for Dashboard)
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(exp => {
      const d = exp.date && typeof exp.date.toDate === 'function' ? exp.date.toDate() : new Date(exp.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const totalMonthly = useMemo(() => 
    currentMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  , [currentMonthExpenses]);

  const categoryData = useMemo(() => {
    const cats = {};
    currentMonthExpenses.forEach(exp => { 
      cats[exp.category] = (cats[exp.category] || 0) + Number(exp.amount); 
    });
    return Object.entries(cats)
      .map(([k, v]) => ({ 
        label: CATEGORIES.find(c => c.id === k)?.label || k, 
        value: v, 
        color: CATEGORIES.find(c => c.id === k)?.color || '#94a3b8' 
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  // 4. Interaction Handlers
  const handleSave = async (data) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense(data);
    }
    setEditingExpense(null);
    setIsModalOpen(false);
    setView('dashboard');
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteExpense(deleteId);
      setDeleteId(null);
    }
  };

  const resetAndAdd = () => {
    setEditingExpense(null);
    // Use modal for "Quick Add" on dashboard, or full view if preferred
    if(view === 'dashboard') setIsModalOpen(true);
    else setView('add');
  };

  // 5. Loading State
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={!!deleteId} 
        title="Delete Expense" 
        message="Permanently remove this transaction?" 
        onConfirm={handleDelete} 
        onCancel={() => setDeleteId(null)} 
      />
      
      {/* Header / Navigation Bar */}
      <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl">
        <div className="flex items-center gap-2 px-2">
          <Wallet size={20} className="text-indigo-600" />
          <h2 className="font-bold text-slate-700 hidden sm:block">WalletWatch</h2>
        </div>
        
        <div className="flex space-x-1">
          {[{ id: 'dashboard', icon: PieChart, label: 'Overview' }, { id: 'history', icon: LayoutList, label: 'History' }, { id: 'add', icon: Plus, label: 'New' }].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => { if(tab.id === 'add') { setEditingExpense(null); } setView(tab.id); }} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${view === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={exportToCSV} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600" title="Export CSV"><FileText size={16}/></button>
          <button onClick={exportToPDF} disabled={exporting} className="p-2 bg-white rounded-lg shadow-sm text-slate-500 hover:text-indigo-600 disabled:opacity-50" title="Export PDF">
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          </button>
        </div>
      </div>

      {/* --- VIEWS --- */}

      {/* View: Dashboard */}
      {view === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           {/* Wrap ID for PDF Capture */}
           <div id="walletwatch-dashboard-charts" className="space-y-6 bg-slate-50 p-2 rounded-xl">
             <DashboardStats totalSpent={totalMonthly} transactionCount={currentMonthExpenses.length} />
             <OverviewCharts expenses={expenses} categoryData={categoryData} totalSpent={totalMonthly} />
           </div>
           
           <div className="flex justify-end">
             <button onClick={resetAndAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex gap-2 shadow-lg shadow-indigo-200">
               <Plus size={16}/> Add Expense
             </button>
           </div>

           <TransactionList 
             expenses={expenses} 
             onEdit={handleEdit} 
             onDelete={setDeleteId} 
             onViewAll={() => setView('history')}
             limit={5} 
           />
        </div>
      )}

      {/* View: History */}
      {view === 'history' && (
         <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <TransactionList 
              expenses={expenses} 
              onEdit={handleEdit} 
              onDelete={setDeleteId} 
            />
         </div>
      )}

      {/* View: Add (Full Page) */}
      {view === 'add' && (
         <TransactionForm 
           initialData={editingExpense} 
           onSubmit={handleSave} 
         />
      )}

      {/* Modal for Quick Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md relative overflow-hidden shadow-2xl">
            <button onClick={() => { setIsModalOpen(false); setEditingExpense(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <TransactionForm initialData={editingExpense} onSubmit={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletWatchApp;
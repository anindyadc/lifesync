import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, CreditCard, TrendingUp, Trash2, Plus, 
  Banknote, Pencil, LayoutList, PieChart, BarChart3, 
  Download, FileText, Loader2, Layers, ChevronDown, ChevronUp, Folder
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { formatCurrency, formatDate } from '../../lib/utils';
import ConfirmModal from '../../components/ConfirmModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// --- Constants ---
const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', color: '#f97316', bg: 'bg-orange-100 text-orange-600' },
  { id: 'travel', label: 'Travel', color: '#3b82f6', bg: 'bg-blue-100 text-blue-600' },
  { id: 'shopping', label: 'Shopping', color: '#a855f7', bg: 'bg-purple-100 text-purple-600' },
  { id: 'utilities', label: 'Bills', color: '#eab308', bg: 'bg-yellow-100 text-yellow-600' },
  { id: 'health', label: 'Health', color: '#22c55e', bg: 'bg-green-100 text-green-600' },
  { id: 'entertainment', label: 'Fun', color: '#ec4899', bg: 'bg-pink-100 text-pink-600' },
  { id: 'other', label: 'Other', color: '#6b7280', bg: 'bg-gray-100 text-gray-600' },
];

const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI', icon: CreditCard },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
];

// --- Local Components ---
const DonutChart = ({ data, total }) => {
  if (total === 0) return <div className="relative w-48 h-48 mx-auto flex items-center justify-center bg-gray-50 rounded-full border-2 border-dashed border-gray-200"><span className="text-gray-400 text-xs">No Data</span></div>;
  
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.map(item => {
    const startPercent = cumulativePercent;
    const slicePercent = item.total / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
    return { path: pathData, color: item.color };
  });

  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
        <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90 transform" style={{ overflow: 'visible' }}>
            {slices.map((slice, i) => (
                <path key={i} d={slice.path} fill={slice.color} stroke="white" strokeWidth="0.02" />
            ))}
            <circle cx="0" cy="0" r="0.6" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Total</span>
            <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
    </div>
  );
};

const WeeklyBarChart = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const total = expenses.filter(e => { const eDate = e.date && typeof e.date.toDate === 'function' ? e.date.toDate() : new Date(e.date); return eDate.getDate() === d.getDate() && eDate.getMonth() === d.getMonth() && eDate.getFullYear() === d.getFullYear(); }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      result.push({ day: dayName, total });
    }
    return result;
  }, [expenses]);
  const maxVal = Math.max(...days.map(d => d.total), 1);
  return (<div className="flex items-end justify-between h-32 pt-4 pb-2 px-2 gap-2">{days.map((d, i) => (<div key={i} className="flex flex-col items-center flex-1 h-full justify-end group"><div className="relative w-full flex items-end justify-center h-full"><div className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ease-out ${d.total > 0 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: '4px' }}></div></div><span className="text-[10px] mt-2 text-gray-400">{d.day.charAt(0)}</span></div>))}</div>);
};

// --- Group Card Component ---
const GroupCard = ({ groupName, items, total, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md mb-3">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex justify-between items-center cursor-pointer bg-slate-50/50 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Folder size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{groupName}</h4>
            <p className="text-xs text-slate-500">{items.length} transaction{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {items.map(exp => (
            <div key={exp.id} className="p-3 pl-16 flex justify-between items-center hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">{exp.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{formatDate(exp.date)}</span>
                  <span>•</span>
                  <span>{CATEGORIES.find(c => c.id === exp.category)?.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">{formatCurrency(exp.amount)}</span>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(exp)} className="p-1 text-slate-300 hover:text-indigo-600 rounded"><Pencil size={12}/></button>
                  <button onClick={() => onDelete(exp.id)} className="p-1 text-slate-300 hover:text-red-500 rounded"><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WalletWatchApp = ({ user }) => {
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [groupByEvent, setGroupByEvent] = useState(false); // Toggle for History view
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState(''); 
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const APP_ID = 'default-app-id';

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedExpenses.sort((a, b) => {
        const dateA = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date);
        const dateB = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      setExpenses(loadedExpenses);
    });
    return () => unsubscribe();
  }, [user]);

  // --- Calculations ---
  // Ensure we capture all expenses, but also split by current month for dashboard
  const currentMonthExpenses = useMemo(() => { 
    const now = new Date(); 
    return expenses.filter(exp => { 
      const d = exp.date && typeof exp.date.toDate === 'function' ? exp.date.toDate() : new Date(exp.date); 
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); 
    }); 
  }, [expenses]);
  
  const totalMonthly = currentMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalAllTime = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const categoryBreakdown = useMemo(() => { 
    const breakdown = {}; 
    currentMonthExpenses.forEach(exp => { breakdown[exp.category] = (breakdown[exp.category] || 0) + Number(exp.amount); }); 
    return Object.entries(breakdown).map(([catId, total]) => ({ id: catId, total, ...CATEGORIES.find(c => c.id === catId) || { label: 'Unknown', color: '#ccc' } })).sort((a, b) => b.total - a.total); 
  }, [currentMonthExpenses]);

  // Grouping Logic
  const groupedExpenses = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    
    expenses.forEach(exp => {
      if (exp.group && exp.group.trim() !== "") {
        if (!groups[exp.group]) groups[exp.group] = { total: 0, items: [] };
        groups[exp.group].items.push(exp);
        groups[exp.group].total += Number(exp.amount);
      } else {
        ungrouped.push(exp);
      }
    });
    
    return { groups, ungrouped };
  }, [expenses]);

  // --- Export Logic ---
  const exportToCSV = () => {
    const headers = ['Date', 'Group', 'Description', 'Category', 'Mode', 'Amount'];
    const rows = expenses.map(e => [
      formatDate(e.date),
      `"${(e.group || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      CATEGORIES.find(c => c.id === e.category)?.label || e.category,
      PAYMENT_MODES.find(p => p.id === e.paymentMode)?.label || e.paymentMode,
      e.amount
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expenses_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229);
      doc.text("WalletWatch Expenses Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);

      let yPos = 40;

      const chartElement = document.getElementById('walletwatch-dashboard-charts');
      
      if (chartElement && view === 'dashboard') {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Dashboard Overview", 14, yPos);
        yPos += 5;

        const canvas = await html2canvas(chartElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Transaction Details", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        head: [['Date', 'Group', 'Description', 'Category', 'Mode', 'Amount (INR)']],
        body: expenses.map(e => [
          formatDate(e.date),
          e.group || '-',
          e.description,
          CATEGORIES.find(c => c.id === e.category)?.label || e.category,
          PAYMENT_MODES.find(p => p.id === e.paymentMode)?.label || e.paymentMode,
          `INR ${Number(e.amount).toLocaleString('en-IN')}` 
        ]),
        startY: yPos,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save("expenses_report.pdf");
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || !user) return;
    const expenseDate = new Date(date); const now = new Date(); expenseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    const payload = { 
      amount: parseFloat(amount), 
      description: description || 'No description', 
      group: group || '', 
      category, 
      paymentMode, 
      date: Timestamp.fromDate(expenseDate), 
      updatedAt: serverTimestamp() 
    };
    const colRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses');
    if (editingId) { await updateDoc(doc(colRef, editingId), payload); } else { await addDoc(colRef, { ...payload, createdAt: serverTimestamp() }); }
    resetForm(); setView('dashboard');
  };

  const confirmDelete = async () => { if (deleteId && user) { await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'expenses', deleteId)); setDeleteId(null); } };
  
  const handleEdit = (exp) => { 
    setEditingId(exp.id); 
    setAmount(exp.amount); 
    setDescription(exp.description); 
    setGroup(exp.group || '');
    setCategory(exp.category); 
    setPaymentMode(exp.paymentMode); 
    const d = exp.date && typeof exp.date.toDate === 'function' ? exp.date.toDate() : new Date(exp.date); 
    const offset = d.getTimezoneOffset(); 
    const localDate = new Date(d.getTime() - (offset*60*1000)); 
    setDate(localDate.toISOString().split('T')[0]); 
    setView('add'); 
  };
  
  const resetForm = () => { setEditingId(null); setAmount(''); setDescription(''); setGroup(''); setCategory(CATEGORIES[0].id); setPaymentMode(PAYMENT_MODES[0].id); setDate(new Date().toISOString().split('T')[0]); };

  return (
    <div className="space-y-6">
      <ConfirmModal isOpen={!!deleteId} title="Delete Expense" message="Permanently remove this transaction?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
      
      <div className="flex justify-between items-center bg-slate-100 p-1 rounded-xl">
        <div className="flex space-x-1">
          {[
            { id: 'dashboard', icon: PieChart, label: 'Overview' }, 
            { id: 'history', icon: LayoutList, label: 'History' }, 
            { id: 'add', icon: Plus, label: 'Add New' }
          ].map(tab => (
            <button key={tab.id} onClick={() => { if(tab.id === 'add') resetForm(); setView(tab.id); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><tab.icon size={16} /> {tab.label}</button>
          ))}
        </div>
        <div className="flex gap-2 pr-2">
          <button onClick={exportToCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200" title="Export CSV"><FileText size={16}/></button>
          <button onClick={exportToPDF} disabled={exporting} className="p-2 text-slate-500 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200 disabled:opacity-50" title="Export PDF">
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          </button>
        </div>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           {/* WRAPPER FOR PDF CAPTURE */}
           <div id="walletwatch-dashboard-charts" className="space-y-6 bg-slate-50 p-2">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                <button onClick={() => { resetForm(); setView('add'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex gap-2"><Plus size={16}/> Add Expense</button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center"><p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Total Spent (Month)</p><p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(totalMonthly)}</p></div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center"><p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Total Spent (All Time)</p><p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(totalAllTime)}</p></div>
             </div>

             <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 text-center">Monthly Breakdown</h3><DonutChart data={categoryBreakdown} total={totalMonthly} /><div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">{categoryBreakdown.map((item) => (<div key={item.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-slate-600">{item.label}</span></div><span className="font-semibold">{formatCurrency(item.total)}</span></div>))}</div></div>
             <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><div className="flex items-center gap-2 mb-4 font-semibold text-slate-800"><BarChart3 size={18} className="text-blue-500" /> Weekly Activity</div><WeeklyBarChart expenses={expenses} /></div>
           </div>
           
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Recent Transactions</h3><button onClick={() => setView('history')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button></div><div className="divide-y divide-slate-100">{expenses.slice(0, 3).map(exp => (<div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${CATEGORIES.find(c => c.id === exp.category)?.bg || 'bg-gray-100'}`}><CreditCard size={18} className="opacity-75" /></div><div><p className="font-medium text-slate-800">{CATEGORIES.find(c => c.id === exp.category)?.label}</p><p className="text-xs text-slate-400">{formatDate(exp.date)}</p></div></div><span className="font-bold text-slate-900">{formatCurrency(exp.amount)}</span></div>))}{expenses.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">No recent transactions</div>}</div></div>
        </div>
      )}

      {view === 'history' && (
         <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
              <button 
                onClick={() => setGroupByEvent(!groupByEvent)} 
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${groupByEvent ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {groupByEvent ? 'Show Individual' : 'Group by Event'}
              </button>
            </div>

            {groupByEvent ? (
              // GROUPED VIEW IN HISTORY
              <>
                {Object.keys(groupedExpenses.groups).length === 0 && groupedExpenses.ungrouped.length === 0 && <div className="text-center py-12 text-slate-400">No transactions found.</div>}
                
                {/* Render Group Cards First */}
                {Object.entries(groupedExpenses.groups).map(([name, data]) => (
                  <GroupCard 
                    key={name}
                    groupName={name}
                    items={data.items}
                    total={data.total}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}

                {/* Render Ungrouped Items */}
                {groupedExpenses.ungrouped.map(exp => (
                  <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                     <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center ${CATEGORIES.find(c => c.id === exp.category)?.bg || 'bg-gray-100'}`}><CreditCard size={20} className="opacity-75" /></div>
                       <div>
                          <h3 className="font-semibold text-slate-800">{CATEGORIES.find(c => c.id === exp.category)?.label}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                             {exp.description} • {formatDate(exp.date)}
                          </p>
                       </div>
                     </div>
                     <div className="text-right flex flex-col items-end"><span className="block font-bold text-slate-900 mb-1">{formatCurrency(exp.amount)}</span><div className="flex items-center gap-2"><span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-medium mr-1">{PAYMENT_MODES.find(p => p.id === exp.paymentMode)?.label}</span><button onClick={() => handleEdit(exp)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button><button onClick={() => setDeleteId(exp.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></div></div>
                  </div>
                ))}
              </>
            ) : (
              // FLAT LIST VIEW
              expenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center ${CATEGORIES.find(c => c.id === exp.category)?.bg || 'bg-gray-100'}`}><CreditCard size={20} className="opacity-75" /></div>
                     <div>
                        <h3 className="font-semibold text-slate-800">{CATEGORIES.find(c => c.id === exp.category)?.label}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                           {exp.description} • {formatDate(exp.date)}
                           {exp.group && <span className="bg-indigo-50 text-indigo-600 px-1.5 rounded ml-2 font-medium">{exp.group}</span>}
                        </p>
                     </div>
                   </div>
                   <div className="text-right flex flex-col items-end"><span className="block font-bold text-slate-900 mb-1">{formatCurrency(exp.amount)}</span><div className="flex items-center gap-2"><span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-medium mr-1">{PAYMENT_MODES.find(p => p.id === exp.paymentMode)?.label}</span><button onClick={() => handleEdit(exp)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button><button onClick={() => setDeleteId(exp.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></div></div>
                </div>
              ))
            )}
         </div>
      )}

      {view === 'add' && (
         <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
             <form onSubmit={handleSave} className="space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required autoFocus={!editingId} /></div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                {/* Group Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group / Event (Optional)</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={group} 
                      onChange={(e) => setGroup(e.target.value)} 
                      placeholder="e.g. Weekend Trip, Office Party" 
                      list="existing-groups"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                    <datalist id="existing-groups">
                      {Object.keys(groupedExpenses.groups).map(g => <option key={g} value={g} />)}
                    </datalist>
                  </div>
                </div>

                <div><label className="block text-sm font-medium text-slate-700 mb-2">Category</label><div className="grid grid-cols-2 gap-2">{CATEGORIES.map(cat => (<button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`p-3 rounded-lg border text-left text-sm font-medium transition-all ${category === cat.id ? `border-indigo-500 ring-1 ring-indigo-500 ${cat.bg}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{cat.label}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-2">Payment</label><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">{PAYMENT_MODES.map(mode => (<option key={mode.id} value={mode.id}>{mode.label}</option>))}</select></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" /></div></div>
                <div className="pt-4"><button type="submit" className={`w-full py-4 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>{editingId ? 'Update Expense' : 'Save Expense'}</button></div>
             </form>
         </div>
      )}
    </div>
  );
};

export default WalletWatchApp;

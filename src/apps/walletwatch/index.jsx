import React, { useState } from 'react';
import { DollarSign, CreditCard, TrendingUp, Trash2, Plus } from 'lucide-react';
import StatCard from '../../components/StatCard'; // Adjust path
import ConfirmModal from '../../components/ConfirmModal'; // Adjust path
import { formatCurrency, formatDate } from '../../lib/utils'; // Adjust path

const WalletWatchApp = () => {
  const [expenses, setExpenses] = useState([
    { id: 1, title: "Server Costs", amount: 450, date: new Date() },
    { id: 2, title: "Software Licenses", amount: 120, date: new Date() },
  ]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const requestDelete = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setExpenses(expenses.filter(e => e.id !== selectedId));
    setShowConfirm(false);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={showConfirm}
        title="Delete Expense"
        message="Are you sure you want to remove this expense record?"
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Spent" value={formatCurrency(total)} icon={DollarSign} color="bg-indigo-600" />
        <StatCard title="Transactions" value={expenses.length} icon={CreditCard} color="bg-purple-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {expenses.map(expense => (
            <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{expense.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(expense.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">{formatCurrency(expense.amount)}</span>
                <button 
                  onClick={() => requestDelete(expense.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletWatchApp;

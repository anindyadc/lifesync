import React, { useState, useEffect } from 'react';
import { CATEGORIES, PAYMENT_MODES } from '../constants';

const TransactionForm = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState({ 
    amount: '', 
    description: '', 
    category: 'food', 
    paymentMode: 'upi',
    date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    if (initialData) {
      const d = initialData.date && typeof initialData.date.toDate === 'function' ? initialData.date.toDate() : new Date(initialData.date);
      // Adjust timezone for input
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
      
      setFormData({
        amount: initialData.amount,
        description: initialData.description,
        category: initialData.category,
        paymentMode: initialData.paymentMode,
        date: localDate
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.amount) return;
    onSubmit(formData);
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{initialData ? 'Edit Transaction' : 'New Transaction'}</h2>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
            <input 
              type="number" 
              value={formData.amount} 
              onChange={(e) => setFormData({...formData, amount: e.target.value})} 
              placeholder="0.00" 
              className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
              required 
              autoFocus={!initialData} 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input 
            type="text" 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            placeholder="What was this for?" 
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                type="button" 
                onClick={() => setFormData({...formData, category: cat.id})} 
                className={`p-3 rounded-lg border text-left text-sm font-medium transition-all ${formData.category === cat.id ? `border-indigo-500 ring-1 ring-indigo-500 ${cat.bg}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment</label>
            <select 
              value={formData.paymentMode} 
              onChange={(e) => setFormData({...formData, paymentMode: e.target.value})} 
              className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {PAYMENT_MODES.map(mode => (<option key={mode.id} value={mode.id}>{mode.label}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={(e) => setFormData({...formData, date: e.target.value})} 
              className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            className={`w-full py-4 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all ${initialData ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
          >
            {initialData ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
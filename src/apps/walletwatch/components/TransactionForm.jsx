import React, { useState, useEffect } from 'react';
import { Layers, ArrowLeftRight, CreditCard, Calendar, Type, Tag } from 'lucide-react';
import { getTagColor } from '../../../lib/utils';

// Modular import for local deployment - ensuring single source of truth
import { PAYMENT_MODES } from '../constants';

/**
 * TransactionForm Component
 * Standardized LifeSync Visuals:
 * - Labels: text-xs font-bold text-slate-500 uppercase
 * - Inputs: rounded-xl bg-slate-50 border-slate-200
 * - Headings: text-xl font-bold text-slate-800
 */
const TransactionForm = ({ initialData, onSubmit, categories, isSettling, expenses = [] }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    group: '',
    tags: '',
    paymentMode: 'upi',
    date: new Date().toISOString().split('T')[0],
    isReimbursable: false
  });

  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  const availableTags = React.useMemo(() => {
    const tagsSet = new Set();
    expenses.forEach(exp => {
      if (exp.tags && Array.isArray(exp.tags)) {
        exp.tags.forEach(t => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).sort();
  }, [expenses]);

  const availableGroups = React.useMemo(() => {
    const groupSet = new Set();
    const currentFormDate = new Date(formData.date);
    const currentFormMonth = currentFormDate.getMonth();
    const currentFormYear = currentFormDate.getFullYear();

    expenses.forEach(exp => {
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      if (
        expDate.getMonth() === currentFormMonth &&
        expDate.getFullYear() === currentFormYear &&
        exp.group && 
        typeof exp.group === 'string' && 
        exp.group.trim() !== ''
      ) {
        groupSet.add(exp.group.trim());
      }
    });
    return Array.from(groupSet).sort();
  }, [expenses, formData.date]);

  const handleTagClick = (tag) => {
    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ') + ', ';
      setFormData({ ...formData, tags: newTags });
    }
    // Keep focus logic simple by letting the user continue typing
  };

  const handleGroupClick = (group) => {
    setFormData({ ...formData, group });
  };

  useEffect(() => {
    if (initialData) {
      const d = initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date);
      setFormData({
        amount: Math.abs(initialData.amount),
        description: initialData.description || '',
        category: initialData.category || '',
        group: initialData.group || '',
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        paymentMode: initialData.paymentMode || 'upi',
        date: d.toISOString().split('T')[0],
        isReimbursable: initialData.reimbursementStatus === 'pending'
      });
    } else if (categories && categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [initialData, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;
    
    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      reimbursementStatus: formData.isReimbursable ? 'pending' : 'none'
    });
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {isSettling ? (
              <ArrowLeftRight className="text-emerald-500" size={20} />
            ) : (
              <CreditCard className="text-indigo-600" size={20} />
            )}
            {isSettling ? 'Record Refund' : (initialData ? 'Edit Entry' : 'New Transaction')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
                autoFocus={!initialData}
              />
            </div>
          </div>

          {/* Description & Group */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Description
              </label>
              <div className="relative">
                <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was this for?"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition-all"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Group / Event (Optional)
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  onFocus={() => setShowGroupSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                  placeholder="e.g. Goa Trip 2024"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition-all"
                />
              </div>
              {showGroupSuggestions && availableGroups.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {availableGroups.filter(g => g.toLowerCase().includes((formData.group || '').toLowerCase())).map(group => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => handleGroupClick(group)}
                      className="px-3 py-2 text-sm font-bold text-left bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors truncate"
                    >
                      {group}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Tags (Comma Separated)
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  placeholder="e.g. food, travel, work"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm transition-all"
                />
              </div>
              {showTagSuggestions && availableTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto p-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {availableTags.map(tag => {
                    const colors = getTagColor(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} hover:opacity-80 rounded-md transition-colors`}
                      >
                        + {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Category Selection Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
              {categories.map(cat => {
                const isSelected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    style={isSelected ? { borderColor: cat.color } : {}}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? `${cat.bg || 'bg-indigo-50 text-indigo-700'} shadow-sm ring-1 ring-opacity-20` 
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold truncate block">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Payment
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
              >
                {PAYMENT_MODES.map(mode => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
              />
            </div>
          </div>

          {/* Lent Toggle Section */}
          {!isSettling && (
            <div className={`p-4 rounded-xl border transition-all duration-200 ${
              formData.isReimbursable 
                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                : 'bg-slate-50 border-slate-200 opacity-80'
            }`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isReimbursable}
                  onChange={(e) => setFormData({ ...formData, isReimbursable: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 transition-all"
                />
                <div>
                  <span className={`block text-xs font-bold uppercase tracking-tight ${
                    formData.isReimbursable ? 'text-indigo-900' : 'text-slate-700'
                  }`}>
                    Lent to someone?
                  </span>
                  <p className={`text-[10px] font-medium leading-tight mt-0.5 ${
                    formData.isReimbursable ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    Mark as pending return
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              {initialData ? 'Update Record' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
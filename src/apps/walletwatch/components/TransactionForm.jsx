import React, { useState, useEffect } from 'react';
import { Layers, ArrowLeftRight, CreditCard, Type, Tag, ChevronDown, CheckCircle2, Loader2, X, Calculator, Delete } from 'lucide-react';
import { getTagColor, toISODate, safeGetDate } from '../../../lib/utils';

// Modular import for local deployment - ensuring single source of truth
import { PAYMENT_MODES, getAvailableTags } from '../constants';

// Safe arithmetic evaluator for the inline Amount calculator — hand-rolled recursive
// descent (+ - * / and parens only) instead of eval()/Function() since the expression
// is built from free-form button taps, not a trusted constant.
function evaluateExpression(expr) {
  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/()])/g);
  if (!tokens || tokens.length === 0) throw new Error('Empty expression');
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  function parseTerm() {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parseFactor();
      if (op === '/') {
        if (rhs === 0) throw new Error('Cannot divide by zero');
        value = value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }
  function parseFactor() {
    if (peek() === '-') { consume(); return -parseFactor(); }
    if (peek() === '(') {
      consume();
      const value = parseExpr();
      if (peek() !== ')') throw new Error('Mismatched parentheses');
      consume();
      return value;
    }
    const token = consume();
    const num = parseFloat(token);
    if (token === undefined || isNaN(num)) throw new Error('Invalid expression');
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Invalid expression');
  if (!isFinite(result)) throw new Error('Invalid result');
  return result;
}

// Indian digit grouping (last 3 digits, then pairs — e.g. 1234567 -> "12,34,567")
// for display only; formData.amount itself stays a plain unformatted numeric string.
function formatIndianNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const str = String(value);
  const negative = str.startsWith('-');
  const unsigned = negative ? str.slice(1) : str;
  const [intPart, decPart] = unsigned.split('.');
  if (!intPart) return unsigned;
  const lastThree = intPart.slice(-3);
  const otherDigits = intPart.slice(0, -3);
  const formattedInt = otherDigits === ''
    ? lastThree
    : otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  return (negative ? '-' : '') + result;
}

/**
 * TransactionForm Component
 * Rendered inside a modal/bottom-sheet shell (see walletwatch/index.jsx) — this
 * component owns only its header + fields, not the outer card/backdrop.
 * Dense fintech visual system:
 * - Section labels: text-[11px] font-semibold text-slate-400 uppercase tracking-wide
 * - Inputs: rounded-lg bg-slate-50 border-slate-200, py-2/py-2.5 (compact)
 * - Heading: text-[15px] font-semibold text-slate-800
 * - Accent: indigo-600, used consistently for the primary action, selected states, icon
 */
const TransactionForm = ({ initialData, onSubmit, onCancel, categories, isSettling, expenses = [] }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    group: '',
    tags: '',
    paymentMode: 'upi',
    paymentAccount: '',
    date: toISODate(new Date()),
    isReimbursable: false,
    isOfficial: false
  });

  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');
  const [calcError, setCalcError] = useState('');
  // Quick-add is the fast path (just Amount/Description/Category); editing an existing
  // entry or recording a refund always shows every field since they may already be set.
  const [showDetails, setShowDetails] = useState(!!initialData || isSettling);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const hasAdvancedData = !!(formData.group || formData.tags || formData.isReimbursable || formData.isOfficial || formData.paymentMode !== 'upi');

  const availableTags = React.useMemo(() => getAvailableTags(expenses), [expenses]);

  const availableGroups = React.useMemo(() => {
    const groupSet = new Set();
    const currentFormDate = safeGetDate(formData.date);
    if (!currentFormDate) return [];
    const currentFormMonth = currentFormDate.getMonth();
    const currentFormYear = currentFormDate.getFullYear();

    expenses.forEach(exp => {
      const expDate = safeGetDate(exp.date);
      if (
        expDate &&
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

  // Sub-accounts under the currently selected Payment Mode (e.g. Mode=UPI suggests
  // "GPay-300"/"Kiwi"; Mode=Card suggests "HDFC"/"Axis") — free text, not a fixed list,
  // so it fits whatever accounts/cards a given user actually has.
  const availableAccounts = React.useMemo(() => {
    const accountSet = new Set();
    expenses.forEach(exp => {
      if (exp.paymentMode === formData.paymentMode && exp.paymentAccount && exp.paymentAccount.trim()) {
        accountSet.add(exp.paymentAccount.trim());
      }
    });
    return Array.from(accountSet).sort();
  }, [expenses, formData.paymentMode]);

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
    setShowGroupSuggestions(false);
  };

  const handleAccountClick = (account) => {
    setFormData({ ...formData, paymentAccount: account });
    setShowAccountSuggestions(false);
  };

  useEffect(() => {
    if (!onCancel) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (initialData) {
      const d = safeGetDate(initialData.date);
      setFormData({
        amount: Math.abs(initialData.amount),
        description: initialData.description || '',
        category: initialData.category || '',
        group: initialData.group || '',
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        paymentMode: initialData.paymentMode || 'upi',
        paymentAccount: initialData.paymentAccount || '',
        date: toISODate(d),
        // A settle form's initialData is built by spreading the ORIGINAL expense being
        // settled (see walletwatch/index.jsx) — which is 'pending' by definition, that's
        // why it was eligible to settle. Blindly inheriting that here would flag the new
        // REFUND entry itself as 'pending' (the "Lent to someone?" checkbox is hidden
        // while isSettling, so the user has no way to see or correct it), making the
        // refund look unsettled and settleable again — a refund of a refund.
        isReimbursable: !isSettling && initialData.reimbursementStatus === 'pending',
        isOfficial: !!initialData.isOfficial
      });
    } else if (categories && categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].id }));
    }
    setShowCalculator(false);
    setCalcExpr('');
    setCalcError('');
  }, [initialData, categories, isSettling]);

  const calcPreview = React.useMemo(() => {
    if (!calcExpr) return null;
    try {
      return evaluateExpression(calcExpr);
    } catch {
      return null;
    }
  }, [calcExpr]);

  const handleCalcButton = (val) => {
    setCalcError('');
    if (val === 'C') { setCalcExpr(''); return; }
    if (val === 'back') { setCalcExpr(prev => prev.slice(0, -1)); return; }
    setCalcExpr(prev => prev + val);
  };

  const handleUseCalcResult = () => {
    try {
      const result = evaluateExpression(calcExpr);
      if (!isFinite(result) || result <= 0) {
        setCalcError('Enter a valid positive amount');
        return;
      }
      setFormData(prev => ({ ...prev, amount: Math.round(result * 100) / 100 }));
      setAmountError('');
      setShowCalculator(false);
      setCalcExpr('');
      setCalcError('');
    } catch {
      setCalcError('Invalid expression');
    }
  };

  // Quality-of-life: once a trip/group has been marked Official once, default new
  // entries under the same group name to Official too, so the user isn't re-checking
  // the box for every single expense on that trip. Adjusted during render (React's
  // documented pattern for "state depends on a changed prop") rather than in an
  // effect, so it applies before paint with no extra render pass.
  const [lastCheckedGroup, setLastCheckedGroup] = useState(formData.group);
  if (!initialData && formData.group !== lastCheckedGroup) {
    setLastCheckedGroup(formData.group);
    const trimmedGroup = (formData.group || '').trim().toLowerCase();
    if (trimmedGroup) {
      const groupIsOfficial = expenses.some(e => e.isOfficial && (e.group || '').trim().toLowerCase() === trimmedGroup);
      if (groupIsOfficial && !formData.isOfficial) {
        setFormData(prev => ({ ...prev, isOfficial: true }));
      }
    }
  }

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    if (!formData.category || saving) return;

    const amountNum = Number(formData.amount);
    if (!formData.amount || isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Enter an amount greater than 0');
      return;
    }
    setAmountError('');
    setSubmitError('');
    setSaving(true);

    try {
      await onSubmit({
        ...formData,
        amount: amountNum,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        reimbursementStatus: formData.isReimbursable ? 'pending' : 'none'
      }, keepOpen);

      if (keepOpen) {
        // Reset only what's unique per expense; carry over Trip/Tags/Payment/Official —
        // logging several expenses from the same trip back-to-back is the common case.
        setFormData(prev => ({
          ...prev,
          amount: '',
          description: '',
          isReimbursable: false,
          date: toISODate(new Date()),
        }));
        setSavedCount(c => c + 1);
      }
    } catch (err) {
      console.error('Transaction save error:', err);
      setSubmitError(err?.message || 'Could not save this transaction — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
  const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          {isSettling ? (
            <ArrowLeftRight className="text-emerald-500" size={16} />
          ) : (
            <CreditCard className="text-indigo-600" size={16} />
          )}
          {isSettling ? 'Record Refund' : (initialData ? 'Edit Entry' : 'New Transaction')}
        </h2>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          {/* Amount — focal field: bigger type, same compact height as other inputs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass + " mb-0"}>Amount</label>
              <button
                type="button"
                onClick={() => setShowCalculator(v => !v)}
                aria-label="Toggle calculator"
                title="Calculator"
                className={`p-1 rounded-md transition-colors ${showCalculator ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                <Calculator size={13} />
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={formatIndianNumber(formData.amount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                  setFormData({ ...formData, amount: raw });
                  setAmountError('');
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all"
                required
                autoFocus={!initialData}
              />
            </div>
            {amountError && <p className="text-[11px] font-semibold text-red-500 mt-1">{amountError}</p>}

            {showCalculator && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between px-1 mb-2 min-h-[18px]">
                  <div className="flex-1 min-w-0 font-mono text-sm font-semibold text-slate-700 truncate">
                    {calcExpr || '0'}
                  </div>
                  {calcExpr && calcPreview !== null && (
                    <div className="text-xs font-semibold text-indigo-500 shrink-0 ml-2">= {calcPreview}</div>
                  )}
                </div>
                {calcError && <p className="text-[11px] font-semibold text-red-500 px-1 mb-1.5">{calcError}</p>}
                <div className="grid grid-cols-4 gap-1.5">
                  {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '.', '0', 'C', '+'].map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCalcButton(key)}
                      className={`py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        ['/', '*', '-', '+'].includes(key)
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                          : key === 'C'
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {key === '/' ? '÷' : key === '*' ? '×' : key}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleCalcButton('back')}
                    aria-label="Backspace"
                    className="px-3 py-1.5 rounded-md text-sm font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center"
                  >
                    <Delete size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleUseCalcResult}
                    className="py-1.5 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Use Result
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <div className="relative">
              <Type className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What was this for?"
                className={`${fieldClass} pl-8`}
              />
            </div>
          </div>

          {/* Category — compact, evenly-sized pills with a subtle selected state */}
          <div>
            <label className={labelClass}>Category</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5 custom-scrollbar">
              {categories.map(cat => {
                const isSelected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    style={isSelected ? { borderColor: cat.color } : {}}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                      isSelected
                        ? `${cat.bg || 'bg-indigo-50 text-indigo-700'}`
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* More details toggle — collapsed by default for quick logging; a dot
              shows there's already something set even while collapsed. */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              More details
              {hasAdvancedData && !showDetails && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          {showDetails && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Group & Tags — paired side by side now that the form has room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className={labelClass}>Trip / Event</label>
                  <div className="relative">
                    <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={formData.group}
                      onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                      onFocus={() => setShowGroupSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                      placeholder="e.g. Goa Trip 2024"
                      className={`${fieldClass} pl-8`}
                    />
                  </div>
                  {showGroupSuggestions && availableGroups.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {availableGroups.filter(g => g.toLowerCase().includes((formData.group || '').toLowerCase())).map(group => (
                        <button
                          key={group}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleGroupClick(group)}
                          className="px-2.5 py-1.5 text-sm font-semibold text-left bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors truncate"
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className={labelClass}>Tags</label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      onFocus={() => setShowTagSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                      placeholder="food, travel, work"
                      className={`${fieldClass} pl-8`}
                    />
                  </div>
                  {showTagSuggestions && availableTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto p-1.5 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {availableTags.map(tag => {
                        const colors = getTagColor(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleTagClick(tag)}
                            className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} hover:opacity-80 rounded-md transition-colors`}
                          >
                            + {tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode, Account & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Payment</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className={fieldClass}
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>{mode.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className={labelClass}>Account</label>
                  <input
                    type="text"
                    value={formData.paymentAccount}
                    onChange={(e) => setFormData({ ...formData, paymentAccount: e.target.value })}
                    onFocus={() => setShowAccountSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAccountSuggestions(false), 200)}
                    placeholder="e.g. GPay-300, HDFC"
                    className={fieldClass}
                  />
                  {showAccountSuggestions && availableAccounts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {availableAccounts.filter(a => a.toLowerCase().includes((formData.paymentAccount || '').toLowerCase())).map(account => (
                        <button
                          key={account}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleAccountClick(account)}
                          className="px-2.5 py-1.5 text-sm font-semibold text-left bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors truncate"
                        >
                          {account}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Lent & Official toggles — side by side on larger screens */}
              {!isSettling && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    formData.isReimbursable
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.isReimbursable}
                      onChange={(e) => setFormData({ ...formData, isReimbursable: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 transition-all shrink-0"
                    />
                    <div className="min-w-0">
                      <span className={`block text-xs font-semibold ${
                        formData.isReimbursable ? 'text-indigo-900' : 'text-slate-700'
                      }`}>
                        Lent to someone?
                      </span>
                      <p className={`text-[10px] font-medium leading-tight ${
                        formData.isReimbursable ? 'text-indigo-600' : 'text-slate-400'
                      }`}>
                        Mark as pending return
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    formData.isOfficial
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.isOfficial}
                      onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 transition-all shrink-0"
                    />
                    <div className="min-w-0">
                      <span className={`block text-xs font-semibold ${
                        formData.isOfficial ? 'text-blue-900' : 'text-slate-700'
                      }`}>
                        Official trip?
                      </span>
                      <p className={`text-[10px] font-medium leading-tight ${
                        formData.isOfficial ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        Employer-reimbursed — kept out of personal reports
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons — slim pinned footer, always reachable without scrolling */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 space-y-2 bg-white">
          {submitError && <p className="text-[11px] font-semibold text-red-500">{submitError}</p>}
          {!initialData && !isSettling ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
                className="w-full py-2 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold text-sm rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save & Add Another'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save & Close'}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : (isSettling ? 'Record Refund' : 'Update Record')}
            </button>
          )}
          {savedCount > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 size={12} /> {savedCount} transaction{savedCount !== 1 ? 's' : ''} saved this session
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;

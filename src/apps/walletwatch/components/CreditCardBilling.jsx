import React, { useState, useMemo } from 'react';
import {
  CreditCard, Plus, X, Loader2, Settings, CheckCircle2, AlertTriangle, Clock,
  Calendar, Pencil, Trash2, ChevronDown, FileText,
} from 'lucide-react';
import { formatCurrency, toISODate } from '../../../lib/utils';
import { PAYMENT_MODES, getAccountKey } from '../constants';
import { csvEscape, downloadCsvContent } from '../hooks/useExport';
import { formatCycleRange } from '../lib/cardCycles';
import ConfirmModal from './ConfirmModal';

const STATUS_META = {
  settled: { label: 'Settled', className: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 },
  short: { label: 'Short', className: 'bg-red-100 text-red-600', icon: AlertTriangle },
  over: { label: 'Over-paid', className: 'bg-blue-100 text-blue-600', icon: AlertTriangle },
  unsettled: { label: 'Not settled', className: 'bg-amber-100 text-amber-600', icon: Clock },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-600', icon: AlertTriangle },
  ok: { label: 'On Budget', className: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 },
  overspent: { label: 'Overspent', className: 'bg-red-100 text-red-600', icon: AlertTriangle },
};

const StatusChip = ({ status, delta }) => {
  const meta = STATUS_META[status] || STATUS_META.unsettled;
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${meta.className}`}>
      <Icon size={11} /> {meta.label}{delta ? ` by ${formatCurrency(Math.abs(delta))}` : ''}
    </span>
  );
};

const CreditCardBilling = ({ cards, allExpenses, loading, addCard, updateCard, removeCard, cyclesForCard, settleCycle, deleteSettlement }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [settleContext, setSettleContext] = useState(null); // { cycle }
  const [unsettleId, setUnsettleId] = useState(null);
  const [showAllCycles, setShowAllCycles] = useState(false);

  const activeCard = selectedCard || cards[0]?.name || null;
  const activeCardObj = cards.find(c => c.name === activeCard) || null;
  const isPrepaidActive = activeCardObj?.cardType === 'prepaid';

  const cycles = useMemo(() => (activeCard ? cyclesForCard(activeCard) : []), [activeCard, cyclesForCard]);
  const visibleCycles = showAllCycles ? cycles : cycles.slice(0, 3);

  // Suggests accounts from both Card- and UPI-mode transactions — a UPI-linked credit
  // card (e.g. RuPay-on-UPI) is logged with paymentMode 'upi', but still names a credit
  // line worth tracking here. Cash is excluded since it never represents a credit line.
  const suggestedNames = useMemo(() => {
    const known = new Set(cards.map(c => c.name));
    const names = new Set();
    allExpenses.forEach(e => {
      if (e.paymentMode === 'card' || e.paymentMode === 'upi') {
        const key = getAccountKey(e);
        if (key && !known.has(key)) names.add(key);
      }
    });
    return Array.from(names).sort();
  }, [allExpenses, cards]);

  const handleUnsettle = async () => {
    if (!unsettleId) return;
    await deleteSettlement(unsettleId);
    setUnsettleId(null);
  };

  const handleExportCsv = () => {
    const headers = isPrepaidActive
      ? ['Card', 'Cycle Start', 'Cycle End', 'Opening Balance', 'Spend', 'Refill Amount', 'Closing Balance']
      : ['Card', 'Cycle Start', 'Cycle End', 'Spend', 'Status', 'Paid Amount', 'Paid Date', 'Paid Via'];
    const rows = cycles.map(c => (isPrepaidActive ? [
      activeCard,
      toISODate(c.cycleStart),
      toISODate(c.cycleEnd),
      c.openingBalance,
      c.cardSpend,
      c.refillAmount,
      c.balance,
    ] : [
      activeCard,
      toISODate(c.cycleStart),
      toISODate(c.cycleEnd),
      c.cardSpend,
      STATUS_META[c.status]?.label || c.status,
      c.settlement ? c.settlement.paidAmount : '',
      c.settlement ? toISODate(c.settlement.paidDate.toDate ? c.settlement.paidDate.toDate() : c.settlement.paidDate) : '',
      c.settlement ? (PAYMENT_MODES.find(m => m.id === c.settlement.paymentMode)?.label || c.settlement.paymentMode) : '',
    ]).map(csvEscape).join(','));
    downloadCsvContent([headers.join(','), ...rows].join('\n'), `${activeCard.replace(/[^a-zA-Z0-9]+/g, '-')}-billing-cycles.csv`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 text-sm font-medium italic">Loading cards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <ConfirmModal
        isOpen={!!unsettleId}
        title="Un-settle Cycle"
        message="This removes the recorded payment for this billing cycle — it goes back to Not Settled."
        onConfirm={handleUnsettle}
        onCancel={() => setUnsettleId(null)}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {cards.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium">No cards configured yet.</p>
          ) : cards.map(c => (
            <button
              key={c.name}
              onClick={() => { setSelectedCard(c.name); setShowAllCycles(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                activeCard === c.name ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard size={15} /> {c.name}
              {c.cardType === 'prepaid' && (
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${activeCard === c.name ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-500'}`}>Prepaid</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeCard && cycles.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
              title="Export this card's cycle history as CSV"
            >
              <FileText size={18} />
            </button>
          )}
          <button
            onClick={() => setIsManageOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-100 transition-all active:scale-95"
          >
            <Settings size={16} /> Manage Cards
          </button>
        </div>
      </div>

      {!activeCard ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No credit cards configured</h4>
          <p className="text-sm text-slate-500 mt-2">Add a card and its billing cycle start day to track statement spend against what you pay off.</p>
          <button
            onClick={() => setIsManageOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Add Credit Card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleCycles.map((cycle, idx) => {
            const isPrepaid = cycle.cardType === 'prepaid';
            const delta = cycle.settlement ? Number(cycle.settlement.paidAmount) - cycle.cardSpend : 0;
            return (
              <div key={cycle.cycleKey} className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${idx === 0 ? 'border-indigo-200 shadow-sm' : 'border-slate-200'}`}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={11} /> {formatCycleRange(cycle.cycleStart, cycle.cycleEnd)} {idx === 0 && <span className="text-indigo-500">&middot; Current cycle</span>}
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(cycle.cardSpend)}</p>
                  {isPrepaid ? (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Opening {formatCurrency(cycle.openingBalance)} + Refill {formatCurrency(cycle.refillAmount)} &rarr; Balance {formatCurrency(cycle.balance)}
                    </p>
                  ) : cycle.settlement && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Paid {formatCurrency(cycle.settlement.paidAmount)} via {PAYMENT_MODES.find(m => m.id === cycle.settlement.paymentMode)?.label || cycle.settlement.paymentMode}
                      {cycle.settlement.paymentAccount ? ` (${cycle.settlement.paymentAccount})` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isPrepaid ? (
                    <StatusChip status={cycle.status} />
                  ) : (
                    <>
                      <StatusChip status={cycle.status} delta={cycle.settlement ? delta : 0} />
                      {cycle.settlement ? (
                        <>
                          <button onClick={() => setSettleContext({ cycle })} aria-label="Edit settlement" title="Edit" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                          <button onClick={() => setUnsettleId(cycle.settlement.id)} aria-label="Un-settle" title="Un-settle" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSettleContext({ cycle })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 shadow-sm transition-all active:scale-95 text-xs font-bold"
                        >
                          <CheckCircle2 size={13} /> Settle
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {cycles.length > 3 && (
            <div className="text-center pt-1">
              <button onClick={() => setShowAllCycles(!showAllCycles)} className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1 mx-auto">
                {showAllCycles ? 'Show Less' : `Show ${cycles.length - 3} Earlier Cycles`}
                <ChevronDown size={13} className={`transition-transform ${showAllCycles ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {isManageOpen && (
        <ManageCardsModal
          cards={cards}
          suggestedNames={suggestedNames}
          addCard={addCard}
          updateCard={updateCard}
          removeCard={removeCard}
          onClose={() => setIsManageOpen(false)}
        />
      )}

      {settleContext && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center" onClick={() => setSettleContext(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <SettleForm
              cardName={activeCard}
              cycle={settleContext.cycle}
              onSubmit={async (data) => { await settleCycle(activeCard, settleContext.cycle, data); setSettleContext(null); }}
              onCancel={() => setSettleContext(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCardBilling;

const labelClass = "block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1";
const fieldClass = "w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none font-medium text-sm transition-all";

/**
 * ManageCardsModal — add/edit/remove configured cards + their billing-cycle start day.
 * Mirrors WalletWatch's existing "Manage Categories" modal (index.jsx) chip + add-row
 * layout, plus a per-chip cycle-start-day number input since that's the one thing a
 * category chip doesn't need.
 */
const ManageCardsModal = ({ cards, suggestedNames, addCard, updateCard, removeCard, onClose }) => {
  const [newName, setNewName] = useState('');
  const [newDay, setNewDay] = useState(1);
  const [newType, setNewType] = useState('credit');
  const [newRefill, setNewRefill] = useState('');
  const [newStartingBalance, setNewStartingBalance] = useState('');
  const [newStartingDate, setNewStartingDate] = useState(() => toISODate(new Date()));
  const [removeCandidate, setRemoveCandidate] = useState(null);

  const handleAdd = (name) => {
    const trimmed = (name ?? newName).trim();
    if (!trimmed) return;
    addCard(trimmed, newDay, newType, newRefill, newStartingBalance, newStartingDate);
    setNewName('');
    setNewDay(1);
    setNewType('credit');
    setNewRefill('');
    setNewStartingBalance('');
    setNewStartingDate(toISODate(new Date()));
  };

  const confirmRemove = async () => {
    if (!removeCandidate) return;
    await removeCard(removeCandidate);
    setRemoveCandidate(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <ConfirmModal
        isOpen={!!removeCandidate}
        title="Remove Credit Card"
        message="This stops matching future billing cycles to this card. Already-recorded settlements stay exactly as they are."
        onConfirm={confirmRemove}
        onCancel={() => setRemoveCandidate(null)}
      />
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-1 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Manage Credit Cards</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-400 font-medium mb-4 shrink-0">Name must match the Account text used on the card's transactions — Card mode or UPI mode both work (e.g. a UPI-linked credit card).</p>

        <div className="space-y-2 mb-4 shrink-0">
          <div className="flex gap-2">
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Card name, e.g. HDFC Credit Card"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium min-w-0"
            />
            <div className="flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
              <button type="button" onClick={() => setNewType('credit')} className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${newType === 'credit' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Credit</button>
              <button type="button" onClick={() => setNewType('prepaid')} className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${newType === 'prepaid' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Prepaid</button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">Cycle day</span>
              <input
                type="number" min="1" max="31" value={newDay} onChange={e => setNewDay(e.target.value)}
                title="Billing cycle start day"
                className="w-full bg-transparent outline-none text-sm font-medium text-center"
              />
            </div>
            {newType === 'prepaid' && (
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">Refill ₹</span>
                <input
                  type="number" min="0" value={newRefill} onChange={e => setNewRefill(e.target.value)}
                  title="Fixed monthly refill amount"
                  className="w-full bg-transparent outline-none text-sm font-medium text-center"
                />
              </div>
            )}
            <button onClick={() => handleAdd()} aria-label="Add card" className="shrink-0 p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm active:scale-90 transition-all">
              <Plus size={18} />
            </button>
          </div>
          {newType === 'prepaid' && (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">Balance ₹</span>
                <input
                  type="number" min="0" value={newStartingBalance} onChange={e => setNewStartingBalance(e.target.value)}
                  title="What the card currently has on it"
                  className="w-full bg-transparent outline-none text-sm font-medium text-center"
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">As of</span>
                <input
                  type="date" value={newStartingDate} onChange={e => setNewStartingDate(e.target.value)}
                  title="Date the starting balance above was accurate"
                  className="w-full bg-transparent outline-none text-sm font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {suggestedNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
            {suggestedNames.map(name => (
              <button key={name} onClick={() => handleAdd(name)} className="px-2.5 py-1 rounded-full border border-dashed border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-50">
                + {name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 p-0.5">
          {cards.map(c => (
            <div key={c.name} className="flex flex-col gap-1.5 pl-3 pr-1.5 py-2 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 truncate">{c.name}</span>
                <button onClick={() => setRemoveCandidate(c.name)} aria-label={`Remove ${c.name}`} title={`Remove ${c.name}`} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
                  <button type="button" onClick={() => updateCard(c.name, { cardType: 'credit' })} className={`px-2 py-1 text-[10px] font-bold transition-colors ${(c.cardType || 'credit') === 'credit' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Credit</button>
                  <button type="button" onClick={() => updateCard(c.name, { cardType: 'prepaid' })} className={`px-2 py-1 text-[10px] font-bold transition-colors ${c.cardType === 'prepaid' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Prepaid</button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-slate-400 font-semibold">Day</span>
                  <input
                    type="number" min="1" max="31" value={c.cycleStartDay}
                    onChange={e => updateCard(c.name, { cycleStartDay: e.target.value })}
                    className="w-12 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-center"
                  />
                </div>
                {c.cardType === 'prepaid' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold">Refill ₹</span>
                    <input
                      type="number" min="0" value={c.refillAmount || 0}
                      onChange={e => updateCard(c.name, { refillAmount: e.target.value })}
                      className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-center"
                    />
                  </div>
                )}
              </div>
              {c.cardType === 'prepaid' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold">Balance ₹</span>
                    <input
                      type="number" min="0" value={c.startingBalance || 0}
                      onChange={e => updateCard(c.name, { startingBalance: e.target.value })}
                      title="What the card currently has on it, as of the date below"
                      className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold">as of</span>
                    <input
                      type="date" value={c.startingBalanceDate || toISODate(new Date())}
                      onChange={e => updateCard(c.name, { startingBalanceDate: e.target.value })}
                      className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shrink-0">
          Done
        </button>
      </div>
    </div>
  );
};

/**
 * SettleForm — records (or edits) the bank payment that settled a billing cycle.
 * Deliberately does not write to `expenses` — see useCreditCards' settleCycle for why.
 */
const SettleForm = ({ cardName, cycle, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState(cycle.settlement?.paidAmount ?? cycle.cardSpend);
  const [date, setDate] = useState(cycle.settlement ? toISODate(cycle.settlement.paidDate.toDate ? cycle.settlement.paidDate.toDate() : cycle.settlement.paidDate) : toISODate(new Date()));
  const [paymentMode, setPaymentMode] = useState(cycle.settlement?.paymentMode || 'upi');
  const [paymentAccount, setPaymentAccount] = useState(cycle.settlement?.paymentAccount || '');
  const [note, setNote] = useState(cycle.settlement?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ paidAmount: amount, paidDate: date, paymentMode, paymentAccount, note });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 font-sans">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0 bg-white">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <CheckCircle2 className="text-emerald-500" size={16} /> Settle — {cardName}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
          <p className="text-[11px] text-slate-400 font-medium">
            Statement spend for {formatCycleRange(cycle.cycleStart, cycle.cycleEnd)}: <span className="font-bold text-slate-600">{formatCurrency(cycle.cardSpend)}</span>
          </p>
          <div>
            <label className={labelClass}>Amount Paid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 outline-none transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Paid From</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={fieldClass}>
                {PAYMENT_MODES.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Account</label>
            <input type="text" value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} placeholder="e.g. HDFC Savings" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering" className={fieldClass} />
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 py-2.5 bg-white">
          <button type="submit" disabled={saving} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (cycle.settlement ? 'Update Settlement' : 'Confirm Settled')}
          </button>
        </div>
      </form>
    </div>
  );
};

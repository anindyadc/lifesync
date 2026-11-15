import React, { useMemo, useState } from 'react';
import { Lock, Edit, Trash2, PiggyBank, CalendarDays, AlertTriangle, Search, Banknote, RotateCcw, CheckCircle2, Eye, EyeOff, LayoutGrid, List as ListIcon, User } from 'lucide-react';
import CustomAlertDialog from '../../../components/AlertDialog';
import SellInvestmentModal from './SellInvestmentModal';
import CloseDepositModal from './CloseDepositModal';
import { safeGetDate } from '../../../lib/utils';
import { MARKET_LINKED_TYPES, FIXED_RETURN_TYPES, STATUS_LABELS, isActiveHolding, maskAccountNumber } from '../constants';

const gainLoss = (invested, compareValue) => {
  if (typeof invested !== 'number' || typeof compareValue !== 'number') return null;
  const diff = compareValue - invested;
  const pct = invested !== 0 ? (diff / invested) * 100 : 0;
  return { diff, pct };
};

const GainLossLine = ({ investment }) => {
  const compareValue = investment.status === 'sold' ? investment.saleValue : investment.currentValue;
  const gl = gainLoss(investment.amount, compareValue);
  if (!gl) return null;
  const sign = gl.diff >= 0 ? '+' : '-';
  const colorClass = gl.diff >= 0 ? 'text-emerald-600' : 'text-red-600';
  return (
    <div className={`text-xs font-medium mt-0.5 ${colorClass}`}>
      {investment.status === 'sold' ? 'Realized ' : 'Now '}
      {sign}₹{Math.abs(gl.diff).toLocaleString('en-IN')} ({sign}{Math.abs(gl.pct).toFixed(1)}%)
    </div>
  );
};

const StatusCell = ({ investment }) => {
  if (!MARKET_LINKED_TYPES.includes(investment.type)) {
    if (!isActiveHolding(investment)) {
      return (
        <div className="text-sm">
          <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{STATUS_LABELS[investment.status] || 'Closed'}</span>
          {investment.closedDate && <div className="text-slate-500 mt-1">{investment.closedDate}</div>}
        </div>
      );
    }
    const mat = safeGetDate(investment.maturityDate);
    const overdue = mat && mat < new Date();
    return (
      <div className="text-sm text-slate-500 flex items-center gap-1">
        <div>
          <div className="flex items-center gap-1">
            <CalendarDays size={16} className="text-slate-400"/>
            {investment.maturityDate || '-'}
          </div>
          {typeof investment.maturityAmount === 'number' && (
            <div className="text-xs font-medium text-emerald-600 mt-0.5">Matures at ₹{investment.maturityAmount.toLocaleString('en-IN')}</div>
          )}
          {overdue && FIXED_RETURN_TYPES.includes(investment.type) && (
            <div className="text-[11px] font-semibold text-amber-600 mt-0.5">Past maturity — mark as closed</div>
          )}
        </div>
      </div>
    );
  }
  if (investment.status === 'sold') {
    return (
      <div className="text-sm">
        <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Sold</span>
        {investment.soldDate && <div className="text-slate-500 mt-1">{investment.soldDate}</div>}
      </div>
    );
  }
  return (
    <div className="text-sm">
      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        {investment.investmentMode === 'sip' ? `SIP · ${investment.sipFrequency || 'monthly'}` : 'Lump Sum'}
      </span>
      {investment.investmentDate && <div className="text-slate-500 mt-1">{investment.investmentDate}</div>}
    </div>
  );
};

const VIEW_MODE_KEY = 'investment-list-view-mode';
const readViewMode = () => {
  try { return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'card'; } catch { return 'card'; }
};

// Accent strip colour per type (cards).
const TYPE_ACCENTS = {
  FD: 'from-sky-400 to-sky-600', TD: 'from-teal-400 to-teal-600', NSC: 'from-violet-400 to-violet-600',
  'Mutual Fund': 'from-emerald-400 to-emerald-600', Stocks: 'from-orange-400 to-orange-600',
  Smallcase: 'from-pink-400 to-pink-600', Gold: 'from-amber-400 to-amber-600', 'Real Estate': 'from-stone-400 to-stone-600',
};

const TYPE_STYLES = {
  FD: 'text-sky-700 bg-sky-50', TD: 'text-teal-700 bg-teal-50', NSC: 'text-violet-700 bg-violet-50',
  'Mutual Fund': 'text-emerald-700 bg-emerald-50', Stocks: 'text-orange-700 bg-orange-50',
  Smallcase: 'text-pink-700 bg-pink-50', Gold: 'text-amber-700 bg-amber-50', 'Real Estate': 'text-stone-700 bg-stone-100',
};

const isLocked = (inv) => {
  const d = safeGetDate(inv.lockInEnd);
  return isActiveHolding(inv) && d && d > new Date();
};

const LockBadges = ({ investment }) => (
  <div className="flex flex-wrap gap-1 mt-1">
    {isLocked(investment) && (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        <Lock size={10} /> Locked until {investment.lockInEnd}
      </span>
    )}
    {investment.taxSaving && (
      <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">80C</span>
    )}
  </div>
);

const AccountNumber = ({ value }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
      A/c: <span className="font-mono">{shown ? value : maskAccountNumber(value)}</span>
      <button type="button" onClick={() => setShown(s => !s)} aria-label={shown ? 'Hide account number' : 'Show account number'} className="text-slate-400 hover:text-slate-600">
        {shown ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
};

const selectCls = "px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm shadow-sm hover:border-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none";

const TypeBadge = ({ type }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[type] || 'text-slate-700 bg-slate-100'}`}>{type}</span>
);

const AmountBlock = ({ investment, align = 'left' }) => {
  if (investment.amount === null) {
    return (
      <div className={`text-xs font-bold text-amber-600 flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`} title="This amount could not be decrypted — the encryption key may have changed or the data is corrupted.">
        <AlertTriangle size={14} /> Unable to decrypt
      </div>
    );
  }
  return (
    <div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">₹{investment.amount?.toLocaleString('en-IN')}</div>
      <GainLossLine investment={investment} />
    </div>
  );
};

const IconBtn = ({ className = '', ...props }) => (
  <button type="button" {...props} className={`p-2 rounded-full transition-colors ${className}`} />
);

const Actions = ({ investment, onEdit, onDelete, onSellClick, onCloseClick, onReopen }) => (
  <div className="flex items-center gap-0.5">
    <IconBtn onClick={() => onEdit(investment)} aria-label="Edit investment" title="Edit" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Edit size={16} /></IconBtn>
    {MARKET_LINKED_TYPES.includes(investment.type) && investment.status !== 'sold' && (
      <IconBtn onClick={() => onSellClick(investment)} aria-label="Sell or redeem investment" title={isLocked(investment) ? `Sell / Redeem (locked until ${investment.lockInEnd})` : 'Sell / Redeem'} className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Banknote size={16} /></IconBtn>
    )}
    {FIXED_RETURN_TYPES.includes(investment.type) && isActiveHolding(investment) && (
      <IconBtn onClick={() => onCloseClick(investment)} aria-label="Mark deposit matured or closed" title="Mark matured / closed" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><CheckCircle2 size={16} /></IconBtn>
    )}
    {!isActiveHolding(investment) && (
      <IconBtn onClick={() => onReopen(investment.id)} aria-label="Reopen investment" title="Reopen" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100"><RotateCcw size={16} /></IconBtn>
    )}
    <CustomAlertDialog
      trigger={<button type="button" aria-label="Delete investment" title="Delete" className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>}
      title="Delete Investment"
      description="Are you sure you want to delete this investment? This action cannot be undone."
      onContinue={() => onDelete(investment.id)}
    />
  </div>
);

const Identity = ({ investment }) => (
  <>
    <div className="text-sm font-semibold text-slate-900 break-words">{investment.name}</div>
    <LockBadges investment={investment} />
    {investment.accountNumber && <AccountNumber value={investment.accountNumber} />}
    {investment.nominee && <div className="text-xs text-slate-400 mt-0.5">Nominee: {investment.nominee}{investment.nomineeRelation ? ` (${investment.nomineeRelation})` : ''}</div>}
    {investment.details && <div className="text-xs text-slate-400 mt-1">{investment.details}</div>}
  </>
);

const InvestmentCard = ({ investment, actions }) => (
  <div className={`group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col ${isActiveHolding(investment) ? '' : 'opacity-80'}`}>
    <div className={`h-1.5 bg-gradient-to-r ${TYPE_ACCENTS[investment.type] || 'from-slate-300 to-slate-500'}`} />
    <div className="p-5 flex flex-col gap-4 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={investment.type} />
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full"><User size={11} />{investment.holder}</span>
        </div>
        <div className="-mr-2 -mt-1 opacity-70 group-hover:opacity-100 transition-opacity">{actions}</div>
      </div>
      <div className="flex-1"><Identity investment={investment} /></div>
      <div className="flex items-end justify-between gap-3 pt-3 border-t border-slate-100">
        <AmountBlock investment={investment} />
        <div className="text-right"><StatusCell investment={investment} /></div>
      </div>
    </div>
  </div>
);

const InvestmentRow = ({ investment, actions }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-slate-50/70 transition-colors">
    <div className="flex items-start gap-3 min-w-0">
      <div className={`w-1 self-stretch rounded-full bg-gradient-to-b ${TYPE_ACCENTS[investment.type] || 'from-slate-300 to-slate-500'}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1"><TypeBadge type={investment.type} /><span className="text-xs text-slate-500">{investment.holder}</span></div>
        <Identity investment={investment} />
      </div>
    </div>
    <AmountBlock investment={investment} />
    <StatusCell investment={investment} />
    <div className="justify-self-end">{actions}</div>
  </div>
);

const InvestmentList = ({ investments, onEdit, onDelete, onSell, onClose, onReopen }) => {
  const [search, setSearch] = useState('');
  const [holderFilter, setHolderFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sellTarget, setSellTarget] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [viewMode, setViewMode] = useState(readViewMode);

  const changeView = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* storage unavailable — view just won't persist */ }
  };

  const uniqueHolders = useMemo(() => [...new Set(investments.map(inv => inv.holder).filter(Boolean))], [investments]);
  const uniqueTypes = useMemo(() => [...new Set(investments.map(inv => inv.type).filter(Boolean))], [investments]);
  const hasClosable = useMemo(() => investments.some(inv => MARKET_LINKED_TYPES.includes(inv.type) || FIXED_RETURN_TYPES.includes(inv.type)), [investments]);

  const filteredInvestments = useMemo(() => {
    const q = search.toLowerCase();
    return investments.filter(inv => {
      const matchesSearch = !q ||
        inv.name?.toLowerCase().includes(q) ||
        inv.accountNumber?.toLowerCase().includes(q) ||
        inv.details?.toLowerCase().includes(q) ||
        inv.holder?.toLowerCase().includes(q) ||
        inv.type?.toLowerCase().includes(q);
      const matchesHolder = holderFilter === 'all' || inv.holder === holderFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'closed' ? !isActiveHolding(inv) : isActiveHolding(inv));
      return matchesSearch && matchesHolder && matchesType && matchesStatus;
    });
  }, [investments, search, holderFilter, typeFilter, statusFilter]);

  if (investments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
        <PiggyBank size={40} className="mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium">No investment added yet.</p>
        <p className="text-sm">Add your first investment to start tracking.</p>
      </div>
    );
  }

  const renderActions = (inv) => (
    <Actions investment={inv} onEdit={onEdit} onDelete={onDelete} onSellClick={setSellTarget} onCloseClick={setCloseTarget} onReopen={onReopen} />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search name, holder, type, account no. or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm shadow-sm hover:border-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter by holder" value={holderFilter} onChange={(e) => setHolderFilter(e.target.value)} className={selectCls}>
            <option value="all">All Holders</option>
            {uniqueHolders.map(holder => <option key={holder} value={holder}>{holder}</option>)}
          </select>
          <select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="all">All Types</option>
            {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          {hasClosable && (
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="all">Active + Closed</option>
              <option value="active">Active Only</option>
              <option value="closed">Sold / Closed Only</option>
            </select>
          )}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl" role="group" aria-label="View mode">
            {[['card', <LayoutGrid size={16} />, 'Card view'], ['list', <ListIcon size={16} />, 'List view']].map(([mode, icon, label]) => (
              <button key={mode} type="button" onClick={() => changeView(mode)} aria-label={label} aria-pressed={viewMode === mode} title={label}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredInvestments.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">No investments match your search/filter.</div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} actions={renderActions(inv)} />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredInvestments.map(inv => <InvestmentRow key={inv.id} investment={inv} actions={renderActions(inv)} />)}
        </div>
      )}

      {closeTarget && (
        <CloseDepositModal
          investment={closeTarget}
          onCancel={() => setCloseTarget(null)}
          onConfirm={async (data) => {
            await onClose(closeTarget.id, data);
            setCloseTarget(null);
          }}
        />
      )}

      {sellTarget && (
        <SellInvestmentModal
          investment={sellTarget}
          onCancel={() => setSellTarget(null)}
          onConfirm={async (data) => {
            await onSell(sellTarget.id, data);
            setSellTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default InvestmentList;

import React, { useMemo, useState } from 'react';
import { AlertCircle, FileText, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';
import { SECTION_80C_LIMIT, MARKET_LINKED_TYPES, INTEREST_BEARING_TYPES, COMPOUNDING_OPTIONS, DEFAULT_COMPOUNDING } from '../constants';
import { getFYLabel, getCurrentFYLabel, fyRangeBetween, fdInterestForFY, classifyGain } from '../lib/financialYear';

const inr = (n) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TaxSummary = ({ investments, exportTaxCSV }) => {
  const fyOptions = useMemo(() => {
    const set = new Set([getCurrentFYLabel()]);
    investments.forEach(inv => {
      if (INTEREST_BEARING_TYPES.includes(inv.type) && inv.investmentDate && inv.maturityDate) {
        const start = safeGetDate(inv.investmentDate);
        const end = safeGetDate(inv.maturityDate);
        if (start && end) fyRangeBetween(start, end).forEach(fy => set.add(fy));
      }
      if (inv.status === 'sold' && inv.soldDate) {
        const d = safeGetDate(inv.soldDate);
        if (d) set.add(getFYLabel(d));
      }
    });
    return [...set].sort().reverse();
  }, [investments]);

  const [selectedFY, setSelectedFY] = useState(fyOptions[0] || getCurrentFYLabel());
  const activeFY = fyOptions.includes(selectedFY) ? selectedFY : (fyOptions[0] || getCurrentFYLabel());

  const { interestRows, totalInterest, missingRateCount } = useMemo(() => {
    const eligible = investments.filter(inv =>
      INTEREST_BEARING_TYPES.includes(inv.type) && inv.investmentDate && inv.maturityDate && typeof inv.amount === 'number'
    );
    const rows = eligible
      .filter(inv => inv.interestRate)
      .map(inv => {
        const start = safeGetDate(inv.investmentDate);
        let end = safeGetDate(inv.maturityDate);
        // Interest stops when a deposit is closed/renewed before its scheduled maturity.
        const closedAt = inv.status && inv.status !== 'sold' && inv.closedDate ? safeGetDate(inv.closedDate) : null;
        if (closedAt && closedAt < end) end = closedAt;
        const comp = inv.compounding || DEFAULT_COMPOUNDING[inv.type] || 'simple';
        const n = COMPOUNDING_OPTIONS.find(o => o.value === comp)?.n ?? 0;
        let interest = fdInterestForFY(inv.amount, Number(inv.interestRate), start, end, activeFY, n);
        // The maturity amount on the receipt is authoritative: scale the estimate so the
        // deposit's lifetime interest matches it exactly (skipped for early closures).
        if (typeof inv.maturityAmount === 'number' && inv.maturityAmount > inv.amount && !(closedAt && closedAt < safeGetDate(inv.maturityDate))) {
          const lifetime = fyRangeBetween(start, end).reduce((sum, fy) => sum + fdInterestForFY(inv.amount, Number(inv.interestRate), start, end, fy, n), 0);
          if (lifetime > 0) interest *= (inv.maturityAmount - inv.amount) / lifetime;
        }
        return { ...inv, interest, scaledToMaturity: typeof inv.maturityAmount === 'number' };
      })
      .filter(row => row.interest > 0);
    return {
      interestRows: rows,
      totalInterest: rows.reduce((s, r) => s + r.interest, 0),
      missingRateCount: eligible.filter(inv => !inv.interestRate).length,
    };
  }, [investments, activeFY]);

  const { gainRows, stcgTotal, ltcgTotal, slabTotal, missingDateCount } = useMemo(() => {
    const eligible = investments
      .filter(inv => MARKET_LINKED_TYPES.includes(inv.type) && inv.status === 'sold' && inv.soldDate && typeof inv.amount === 'number' && typeof inv.saleValue === 'number')
      .filter(inv => {
        const d = safeGetDate(inv.soldDate);
        return d && getFYLabel(d) === activeFY;
      });
    const rows = eligible.map(inv => {
      const purchaseDate = safeGetDate(inv.investmentDate);
      const saleDate = safeGetDate(inv.soldDate);
      const gain = inv.saleValue - inv.amount;
      const category = inv.type === 'Mutual Fund' ? (inv.fundCategory || 'equity') : 'equity';
      const classification = category === 'debt' ? 'SLAB' : (purchaseDate ? classifyGain(purchaseDate, saleDate, category) : null);
      const holdingDays = purchaseDate ? Math.round((saleDate - purchaseDate) / 86400000) : null;
      return { ...inv, gain, classification, holdingDays };
    });
    return {
      gainRows: rows,
      stcgTotal: rows.filter(r => r.classification === 'STCG').reduce((s, r) => s + r.gain, 0),
      ltcgTotal: rows.filter(r => r.classification === 'LTCG').reduce((s, r) => s + r.gain, 0),
      slabTotal: rows.filter(r => r.classification === 'SLAB').reduce((s, r) => s + r.gain, 0),
      missingDateCount: rows.filter(r => !r.classification).length,
    };
  }, [investments, activeFY]);

  // Section 80C: counted in the financial year of the investment date, per holder.
  const { c80Rows, c80ByHolder } = useMemo(() => {
    const rows = investments
      .filter(inv => inv.taxSaving && typeof inv.amount === 'number' && inv.investmentDate)
      .filter(inv => {
        const d = safeGetDate(inv.investmentDate);
        return d && getFYLabel(d) === activeFY;
      });
    const byHolder = {};
    rows.forEach(r => { byHolder[r.holder || 'Self'] = (byHolder[r.holder || 'Self'] || 0) + r.amount; });
    return { c80Rows: rows, c80ByHolder: Object.entries(byHolder) };
  }, [investments, activeFY]);

  const hasAnyData = interestRows.length > 0 || gainRows.length > 0 || c80Rows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label htmlFor="fy-select" className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Financial Year</label>
          <select
            id="fy-select"
            value={activeFY}
            onChange={e => setSelectedFY(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {fyOptions.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
          </select>
        </div>
        <button
          onClick={() => exportTaxCSV(activeFY, interestRows, gainRows, c80Rows)}
          disabled={!hasAnyData}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText size={16} /> Export FY {activeFY} CSV
        </button>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-3 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <p><strong>Estimates, not filing-ready figures.</strong> FD/TD/NSC interest is compounded per the schedule you set (and scaled to the maturity amount when you've entered one) — verify against Form 26AS/AIS or your interest certificate.</p>
          <p>Capital gains treat each holding as a single lot from its Investment/Purchase Date — a SIP's individual installments each have their own real purchase date and would each be classified separately for an exact filing.</p>
          <p>STCG/LTCG here means "held under/over 12 months," the equity threshold. Debt-fund gains are shown as "Slab" (taxed at your income-tax slab rate) and excluded from the STCG/LTCG totals. Tax rates and exemption limits change by year and aren't applied here. Confirm current rates with a CA before filing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Landmark size={22} /></div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">FD/TD/NSC Interest Income</p>
            <p className="text-xl font-bold text-slate-800">{inr(totalInterest)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${stcgTotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {stcgTotal >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Short-Term Capital Gain</p>
            <p className="text-xl font-bold text-slate-800">{stcgTotal < 0 ? '-' : ''}{inr(stcgTotal)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${ltcgTotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {ltcgTotal >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Long-Term Capital Gain</p>
            <p className="text-xl font-bold text-slate-800">{ltcgTotal < 0 ? '-' : ''}{inr(ltcgTotal)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800">Section 80C — FY {activeFY}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tracks investments flagged 80C-eligible against the ₹{SECTION_80C_LIMIT.toLocaleString('en-IN')} annual limit (old tax regime only —
            not available under the new regime). EPF, PPF, LIC premiums, tuition fees and home-loan principal also count toward the same limit but aren't tracked here,
            so treat "remaining" as an upper bound. Interest on NSC for years 1–4 is also deemed reinvested and eligible; that isn't computed here.
          </p>
        </div>
        {c80ByHolder.length === 0 ? (
          <p className="text-sm text-slate-400">No 80C-eligible investments dated in FY {activeFY}.</p>
        ) : c80ByHolder.map(([holder, total]) => {
          const pct = Math.min(100, (total / SECTION_80C_LIMIT) * 100);
          const over = total > SECTION_80C_LIMIT;
          return (
            <div key={holder}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">{holder}</span>
                <span className="text-slate-600">{inr(total)} of {inr(SECTION_80C_LIMIT)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {over ? `${inr(total - SECTION_80C_LIMIT)} above the limit — the excess isn't deductible.` : `${inr(SECTION_80C_LIMIT - total)} of limit remaining`}
              </p>
            </div>
          );
        })}
        {c80Rows.length > 0 && (
          <ul className="text-sm text-slate-600 divide-y divide-slate-100">
            {c80Rows.map(r => (
              <li key={r.id} className="py-1.5 flex justify-between gap-3">
                <span>{r.type} — {r.name} <span className="text-slate-400">({r.holder})</span></span>
                <span className="font-medium text-slate-800">{inr(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">FD / TD / NSC Interest — FY {activeFY}</h3>
          {missingRateCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">{missingRateCount} FD/TD/NSC entr{missingRateCount === 1 ? 'y has' : 'ies have'} no interest rate set, so they're excluded here — edit them to add one.</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Holder</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Principal</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Interest (FY)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {interestRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No FD/TD/NSC interest accrued in FY {activeFY}.</td></tr>
              ) : interestRows.map(row => (
                <tr key={row.id}>
                  <td className="px-6 py-3 text-sm text-slate-900">{row.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.holder}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-900">{inr(row.amount)}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-500">{row.interestRate}%</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-slate-900">{inr(row.interest)}</td>
                </tr>
              ))}
            </tbody>
            {interestRows.length > 0 && (
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm text-right font-semibold text-slate-600">Total</td>
                  <td className="px-6 py-3 text-sm text-right font-bold text-slate-900">{inr(totalInterest)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {slabTotal !== 0 && (
        <p className="text-sm text-slate-600">Debt-fund gains taxed at slab rate this FY: <strong>{slabTotal < 0 ? '-' : ''}{inr(slabTotal)}</strong></p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Realized Capital Gains — FY {activeFY}</h3>
          {missingDateCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">{missingDateCount} sold holding{missingDateCount === 1 ? '' : 's'} {missingDateCount === 1 ? 'has' : 'have'} no purchase date recorded, so STCG/LTCG couldn't be classified.</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Holder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Held</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Invested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Sale Value</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gain/Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {gainRows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">No holdings sold in FY {activeFY}.</td></tr>
              ) : gainRows.map(row => (
                <tr key={row.id}>
                  <td className="px-6 py-3 text-sm text-slate-900">{row.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.holder}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.holdingDays !== null ? `${row.holdingDays}d` : '-'}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-900">{inr(row.amount)}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-900">{inr(row.saleValue)}</td>
                  <td className={`px-6 py-3 text-sm text-right font-semibold ${row.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.gain >= 0 ? '+' : '-'}{inr(row.gain)}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {row.classification ? (
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${row.classification === 'LTCG' ? 'text-emerald-700 bg-emerald-50' : row.classification === 'SLAB' ? 'text-slate-700 bg-slate-100' : 'text-amber-700 bg-amber-50'}`}>
                        {row.classification === 'SLAB' ? 'Slab' : row.classification}
                      </span>
                    ) : <span className="text-xs text-slate-400">Unknown</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxSummary;

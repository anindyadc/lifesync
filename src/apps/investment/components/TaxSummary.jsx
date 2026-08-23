import React, { useMemo, useState } from 'react';
import { AlertCircle, FileText, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';
import { MARKET_LINKED_TYPES, INTEREST_BEARING_TYPES } from '../constants';
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
        const end = safeGetDate(inv.maturityDate);
        const interest = fdInterestForFY(inv.amount, Number(inv.interestRate), start, end, activeFY);
        return { ...inv, interest };
      })
      .filter(row => row.interest > 0);
    return {
      interestRows: rows,
      totalInterest: rows.reduce((s, r) => s + r.interest, 0),
      missingRateCount: eligible.filter(inv => !inv.interestRate).length,
    };
  }, [investments, activeFY]);

  const { gainRows, stcgTotal, ltcgTotal, missingDateCount } = useMemo(() => {
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
      const classification = purchaseDate ? classifyGain(purchaseDate, saleDate) : null;
      const holdingDays = purchaseDate ? Math.round((saleDate - purchaseDate) / 86400000) : null;
      return { ...inv, gain, classification, holdingDays };
    });
    return {
      gainRows: rows,
      stcgTotal: rows.filter(r => r.classification === 'STCG').reduce((s, r) => s + r.gain, 0),
      ltcgTotal: rows.filter(r => r.classification === 'LTCG').reduce((s, r) => s + r.gain, 0),
      missingDateCount: rows.filter(r => !r.classification).length,
    };
  }, [investments, activeFY]);

  const hasAnyData = interestRows.length > 0 || gainRows.length > 0;

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
          onClick={() => exportTaxCSV(activeFY, interestRows, gainRows)}
          disabled={!hasAnyData}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText size={16} /> Export FY {activeFY} CSV
        </button>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex gap-3 text-sm">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <p><strong>Estimates, not filing-ready figures.</strong> FD/NSC interest uses simple-interest accrual (not your bank's actual compounding) — verify against Form 26AS/AIS or your interest certificate.</p>
          <p>Capital gains treat each holding as a single lot from its Investment/Purchase Date — a SIP's individual installments each have their own real purchase date and would each be classified separately for an exact filing.</p>
          <p>STCG/LTCG here means "held under/over 12 months," the equity threshold — actual tax rates and exemption limits change by year and aren't applied here. Confirm current rates with a CA before filing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Landmark size={22} /></div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">FD/NSC Interest Income</p>
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">FD / NSC Interest — FY {activeFY}</h3>
          {missingRateCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">{missingRateCount} FD/NSC entr{missingRateCount === 1 ? 'y has' : 'ies have'} no interest rate set, so they're excluded here — edit them to add one.</p>
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
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No FD/NSC interest accrued in FY {activeFY}.</td></tr>
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
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${row.classification === 'LTCG' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                        {row.classification}
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

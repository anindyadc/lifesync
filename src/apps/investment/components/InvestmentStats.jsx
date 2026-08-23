import React, { useMemo } from 'react';
import { PiggyBank, CalendarClock, TrendingUp, LineChart } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';

const InvestmentStats = ({ investments }) => {
  const stats = useMemo(() => {
    const validAmounts = investments.filter(inv => typeof inv.amount === 'number' && !isNaN(inv.amount));
    const totalInvested = validAmounts.reduce((sum, inv) => sum + inv.amount, 0);
    const undecryptableCount = investments.filter(inv => inv.amount === null).length;

    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);

    const maturingWithin = (limit) => investments.filter(inv => {
      const d = safeGetDate(inv.maturityDate);
      return d && d >= now && d <= limit;
    }).length;

    // Unrealized gain/loss across active market-linked holdings that have a
    // Current Value entered — sold holdings are excluded since their gain is
    // already realized (see the Tax Summary tab), not part of "current" portfolio value.
    const tracked = investments.filter(inv =>
      inv.status !== 'sold' && typeof inv.amount === 'number' && typeof inv.currentValue === 'number'
    );
    const trackedInvested = tracked.reduce((sum, inv) => sum + inv.amount, 0);
    const trackedCurrentValue = tracked.reduce((sum, inv) => sum + inv.currentValue, 0);

    return {
      totalInvested,
      undecryptableCount,
      maturingIn30: maturingWithin(in30),
      maturingIn90: maturingWithin(in90),
      trackedCount: tracked.length,
      trackedInvested,
      trackedCurrentValue,
    };
  }, [investments]);

  const showPortfolioTile = stats.trackedCount > 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 ${showPortfolioTile ? 'lg:grid-cols-4' : ''} gap-4`}>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><PiggyBank size={22} /></div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Invested</p>
          <p className="text-xl font-bold text-slate-800">₹{stats.totalInvested.toLocaleString('en-IN')}</p>
          {stats.undecryptableCount > 0 && (
            <p className="text-[11px] font-medium text-amber-600 mt-0.5">
              Excludes {stats.undecryptableCount} record{stats.undecryptableCount !== 1 ? 's' : ''} that couldn't be decrypted
            </p>
          )}
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><CalendarClock size={22} /></div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Maturing in 30 Days</p>
          <p className="text-xl font-bold text-slate-800">{stats.maturingIn30}</p>
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={22} /></div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Maturing in 90 Days</p>
          <p className="text-xl font-bold text-slate-800">{stats.maturingIn90}</p>
        </div>
      </div>
      {showPortfolioTile && (() => {
        const diff = stats.trackedCurrentValue - stats.trackedInvested;
        const pct = stats.trackedInvested !== 0 ? (diff / stats.trackedInvested) * 100 : 0;
        const positive = diff >= 0;
        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}><LineChart size={22} /></div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Portfolio Value (Active)</p>
              <p className="text-xl font-bold text-slate-800">₹{stats.trackedCurrentValue.toLocaleString('en-IN')}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {positive ? '+' : '-'}₹{Math.abs(diff).toLocaleString('en-IN')} ({positive ? '+' : '-'}{Math.abs(pct).toFixed(1)}%)
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvestmentStats;

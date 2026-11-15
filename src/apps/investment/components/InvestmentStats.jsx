import React, { useMemo } from 'react';
import { PiggyBank, CalendarClock, TrendingUp, LineChart } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';
import { isActiveHolding } from '../constants';

const Tile = ({ icon, tint, label, value, sub, hero }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm ${hero ? 'bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent text-white' : 'bg-white border-slate-200'}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${hero ? 'text-indigo-100' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-2xl font-bold mt-1 tabular-nums ${hero ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        {sub}
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${hero ? 'bg-white/20 text-white' : tint}`}>{icon}</div>
    </div>
  </div>
);

const InvestmentStats = ({ investments }) => {
  const stats = useMemo(() => {
    // Only live holdings count: matured/closed/renewed deposits and sold holdings are history.
    const live = investments.filter(isActiveHolding);
    const validAmounts = live.filter(inv => typeof inv.amount === 'number' && !isNaN(inv.amount));
    const totalInvested = validAmounts.reduce((sum, inv) => sum + inv.amount, 0);
    const undecryptableCount = live.filter(inv => inv.amount === null).length;

    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);

    const maturingWithin = (limit) => live.filter(inv => {
      const d = safeGetDate(inv.maturityDate);
      return d && d >= now && d <= limit;
    }).length;

    // Unrealized gain/loss across active market-linked holdings that have a
    // Current Value entered — sold holdings are excluded since their gain is
    // already realized (see the Tax Summary tab), not part of "current" portfolio value.
    const tracked = live.filter(inv =>
       typeof inv.amount === 'number' && typeof inv.currentValue === 'number'
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

  const diff = stats.trackedCurrentValue - stats.trackedInvested;
  const pct = stats.trackedInvested !== 0 ? (diff / stats.trackedInvested) * 100 : 0;
  const positive = diff >= 0;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPortfolioTile ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
      <Tile
        hero icon={<PiggyBank size={20} />} label="Total Invested (Active)"
        value={`₹${stats.totalInvested.toLocaleString('en-IN')}`}
        sub={stats.undecryptableCount > 0 && (
          <p className="text-[11px] font-medium text-amber-200 mt-1">
            Excludes {stats.undecryptableCount} record{stats.undecryptableCount !== 1 ? 's' : ''} that couldn't be decrypted
          </p>
        )}
      />
      <Tile icon={<CalendarClock size={20} />} tint="bg-amber-50 text-amber-600" label="Maturing in 30 Days" value={stats.maturingIn30} />
      <Tile icon={<TrendingUp size={20} />} tint="bg-emerald-50 text-emerald-600" label="Maturing in 90 Days" value={stats.maturingIn90} />
      {showPortfolioTile && (
        <Tile
          icon={<LineChart size={20} />} tint={positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}
          label="Portfolio Value (Active)" value={`₹${stats.trackedCurrentValue.toLocaleString('en-IN')}`}
          sub={(
            <p className={`text-xs font-semibold mt-1 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {positive ? '▲ +' : '▼ -'}₹{Math.abs(diff).toLocaleString('en-IN')} ({positive ? '+' : '-'}{Math.abs(pct).toFixed(1)}%)
            </p>
          )}
        />
      )}
    </div>
  );
};

export default InvestmentStats;

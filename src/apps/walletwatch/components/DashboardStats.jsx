import React from 'react';
import { formatCurrency } from '../../../lib/utils';

const DashboardStats = ({ totalSpent, transactionCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Total Spent (Month)</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(totalSpent)}</p>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Transactions</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{transactionCount}</p>
      </div>
    </div>
  );
};

export default DashboardStats;
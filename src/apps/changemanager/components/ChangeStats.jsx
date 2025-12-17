import React from 'react';

const ChangeStats = ({ totalChanges, uniqueServersCount, failedCount }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-2">Stats</h3>
      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Total Changes</span>
          <span className="font-bold">{totalChanges}</span>
        </div>
        <div className="flex justify-between">
          <span>Servers Managed</span>
          <span className="font-bold">{uniqueServersCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Failed Changes</span>
          <span className="font-bold text-red-500">{failedCount}</span>
        </div>
      </div>
    </div>
  );
};

export default ChangeStats;
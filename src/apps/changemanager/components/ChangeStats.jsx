import React from 'react';

const ChangeStats = ({ totalChanges, uniqueServersCount, failedCount, archivedCount, onFailedClick, isFailedFilterActive }) => {
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
        <button
          type="button"
          onClick={onFailedClick}
          className={`w-full flex justify-between items-center -mx-1 px-1 py-0.5 rounded transition-colors ${isFailedFilterActive ? 'bg-red-50' : 'hover:bg-slate-50'}`}
          title={isFailedFilterActive ? 'Clear failed filter' : 'Show only failed changes'}
        >
          <span>Failed Changes</span>
          <span className="font-bold text-red-500">{failedCount}</span>
        </button>
        <div className="flex justify-between">
          <span>Archived</span>
          <span className="font-bold text-slate-500">{archivedCount}</span>
        </div>
      </div>
    </div>
  );
};

export default ChangeStats;
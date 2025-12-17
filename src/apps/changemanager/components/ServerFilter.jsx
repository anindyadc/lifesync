import React from 'react';
import { Filter } from 'lucide-react';

const ServerFilter = ({ servers, onSelect }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Filter size={16}/> Servers
      </h3>
      <div className="flex flex-wrap gap-2">
        {servers.slice(0, 15).map(server => (
          <button 
            key={server}
            onClick={() => onSelect(server)}
            className="text-xs px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded transition-colors"
          >
            {server}
          </button>
        ))}
        {servers.length === 0 && <span className="text-xs text-slate-400">No servers logged yet.</span>}
      </div>
    </div>
  );
};

export default ServerFilter;
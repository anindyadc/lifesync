import React from 'react';
import { formatDate } from '../../../lib/utils';

const TimelineItem = ({ change, isLast }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className={`w-3 h-3 rounded-full mt-1.5 ${change.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>}
    </div>
    <div className="pb-8 flex-1">
      <p className="text-xs text-slate-400 font-mono mb-1">{formatDate(change.date)}</p>
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-slate-800 text-sm">{change.title}</h4>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-medium">{change.type}</span>
        </div>
        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{change.description}</p>
        {change.parameters && (
          <div className="mt-3 bg-slate-50 p-2 rounded text-xs font-mono text-slate-600 border border-slate-200">
            <strong>Params:</strong> {change.parameters}
          </div>
        )}
        <div className="mt-2 text-xs text-slate-400 flex justify-between items-center pt-2 border-t border-slate-50">
          <span>Performed by: <span className="font-medium text-slate-600">{change.performedBy || 'Admin'}</span></span>
          <span className={`uppercase text-[10px] font-bold ${change.status === 'failed' ? 'text-red-500' : 'text-emerald-600'}`}>{change.status}</span>
        </div>
      </div>
    </div>
  </div>
);

export default TimelineItem;
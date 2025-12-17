import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { CATEGORIES } from '../constants';

// Internal SVG Donut
const Donut = ({ data, total }) => {
  if (total === 0) return <div className="relative w-48 h-48 mx-auto flex items-center justify-center bg-gray-50 rounded-full border-2 border-dashed border-gray-200"><span className="text-gray-400 text-xs">No Data</span></div>;
  
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.map((item, i) => {
    const startPercent = cumulativePercent;
    const slicePercent = item.value / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    
    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(' ');
    
    return { path: pathData, color: item.color, key: i };
  });

  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
        <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90 transform" style={{ overflow: 'visible' }}>
            {slices.map((slice) => (
                <path key={slice.key} d={slice.path} fill={slice.color} stroke="white" strokeWidth="0.02" />
            ))}
            <circle cx="0" cy="0" r="0.6" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Total</span>
            <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
    </div>
  );
};

// Internal Weekly Bar
const WeeklyBar = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); 
      d.setDate(d.getDate() - i); 
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const total = expenses.filter(e => { 
        const eDate = e.date && typeof e.date.toDate === 'function' ? e.date.toDate() : new Date(e.date); 
        return eDate.getDate() === d.getDate() && eDate.getMonth() === d.getMonth() && eDate.getFullYear() === d.getFullYear(); 
      }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      result.push({ day: dayName, total });
    }
    return result;
  }, [expenses]);
  
  const maxVal = Math.max(...days.map(d => d.total), 1);
  return (
    <div className="flex items-end justify-between h-32 pt-4 pb-2 px-2 gap-2">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
           <div className="relative w-full flex items-end justify-center h-full">
             <div className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ease-out ${d.total > 0 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: '4px' }}></div>
           </div>
           <span className="text-[10px] mt-2 text-gray-400">{d.day.charAt(0)}</span>
        </div>
      ))}
    </div>
  );
};

const OverviewCharts = ({ expenses, categoryData, totalSpent }) => {
  return (
    <div className="space-y-4">
      {/* Category Donut */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 text-center">Monthly Breakdown</h3>
        <Donut data={categoryData} total={totalSpent} />
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categoryData.slice(0, 8).map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-slate-600">{item.label}</span>
              </div>
              <span className="font-semibold">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 font-semibold text-slate-800">
          <BarChart3 size={18} className="text-blue-500" /> Weekly Activity
        </div>
        <WeeklyBar expenses={expenses} />
      </div>
    </div>
  );
};

export default OverviewCharts;
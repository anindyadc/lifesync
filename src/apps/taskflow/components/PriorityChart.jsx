import React from 'react';

// SVG Donut Chart for Tasks
const SimpleDonutChart = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data available</div>;
  
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  let cumulativePercent = 0;
  const slices = data.map((slice, i) => {
    const startPercent = cumulativePercent;
    const slicePercent = slice.value / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
    return { path: pathData, color: slice.color, key: i };
  });

  return (
    <div className="h-40 relative flex items-center justify-center">
       {/* Overflow visible ensures tooltips or small edges don't get clipped in PDF */}
       <svg viewBox="-1 -1 2 2" className="w-32 h-32 -rotate-90 transform" style={{ overflow: 'visible' }}>
        {slices.map((slice) => <path key={slice.key} d={slice.path} fill={slice.color} stroke="white" strokeWidth="0.05" />)}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
    </div>
  );
};

const PriorityChart = ({ priorityData }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-6">Task Priority</h3>
      <div className="flex flex-col items-center">
        <SimpleDonutChart data={priorityData} />
        <div className="flex gap-4 mt-6">
          {priorityData.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
              {d.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriorityChart;
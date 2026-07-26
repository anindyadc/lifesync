import React, { useState, useMemo } from 'react';

// SVG Donut Chart, shared by ChangeStatusChart and ChangeTypeChart — hover a slice or a
// legend row to highlight it; the legend shows both count and share of the total.
// Mirrors TaskFlow's SimpleDonutChart (src/apps/taskflow/components/PriorityChart.jsx);
// duplicated locally rather than imported since each app module is self-contained.
export const SimpleDonutChart = ({ data, hovered, onHover }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  if (total === 0) return <div className="h-32 flex items-center justify-center text-slate-400 text-xs">No data yet</div>;

  const nonZeroSlices = data.filter(d => d.value > 0);
  const isSingleSlice = nonZeroSlices.length === 1;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  let cumulativePercent = 0;
  const slices = isSingleSlice ? [] : data.map((slice, i) => {
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
    <div className="h-32 relative flex items-center justify-center">
      <svg viewBox="-1 -1 2 2" className="w-24 h-24 -rotate-90 transform" style={{ overflow: 'visible' }}>
        {isSingleSlice ? (
          <circle cx="0" cy="0" r="1" fill={nonZeroSlices[0].color} />
        ) : (
          slices.map((slice) => (
            <path
              key={slice.key}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="0.05"
              opacity={hovered === null || hovered === slice.key ? 1 : 0.35}
              onMouseEnter={() => onHover?.(slice.key)}
              onMouseLeave={() => onHover?.(null)}
              className="transition-opacity cursor-pointer"
            />
          ))
        )}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
    </div>
  );
};

const STATUS_COLORS = {
  success: '#10b981',
  pending: '#f59e0b',
  failed: '#ef4444',
};

const ChangeStatusChart = ({ changes = [] }) => {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(() => {
    const counts = { success: 0, pending: 0, failed: 0 };
    changes.forEach(c => {
      if (c.status in counts) counts[c.status] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name],
    }));
  }, [changes]);

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4">Status Breakdown</h3>
      <div className="flex flex-col items-center">
        <SimpleDonutChart data={data} hovered={hovered} onHover={setHovered} />
        <div className="w-full mt-3 space-y-1.5">
          {data.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center justify-between text-xs font-medium text-slate-600 px-1 py-0.5 rounded transition-opacity"
              style={{ opacity: hovered === null || hovered === i ? 1 : 0.4 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                {d.name}
              </span>
              <span className="text-slate-400">
                {d.value} · {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChangeStatusChart;

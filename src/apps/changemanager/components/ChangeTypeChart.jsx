import React, { useState, useMemo } from 'react';
import { SimpleDonutChart } from './ChangeStatusChart';

// Same validated palette as TaskFlow's CATEGORICAL_PALETTE (constants.js), assigned by
// count-sorted slot since change Type has no persisted color of its own.
const PALETTE = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];

const ChangeTypeChart = ({ changes = [] }) => {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(() => {
    const counts = {};
    changes.forEach(c => {
      const key = c.type || 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));
  }, [changes]);

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4">Change Type</h3>
      <div className="flex flex-col items-center">
        <SimpleDonutChart data={data} hovered={hovered} onHover={setHovered} />
        <div className="w-full mt-3 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
          {data.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center justify-between text-xs font-medium text-slate-600 px-1 py-0.5 rounded transition-opacity"
              style={{ opacity: hovered === null || hovered === i ? 1 : 0.4 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                <span className="truncate">{d.name}</span>
              </span>
              <span className="text-slate-400 shrink-0 ml-2">
                {d.value} · {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChangeTypeChart;

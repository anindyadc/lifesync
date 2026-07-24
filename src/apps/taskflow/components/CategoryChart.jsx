import React, { useState, useMemo } from 'react';
import { SimpleDonutChart } from './PriorityChart';
import { OTHER_SLOT } from '../constants';

/**
 * CategoryChart
 * Same donut+legend form as PriorityChart, grouped by task category instead of
 * priority — categories carry their own validated color; any category no longer
 * in the current list (e.g. removed via Manage Categories after being assigned)
 * falls back to the neutral "Other" slot rather than a random color.
 */
const CategoryChart = ({ tasks, categories = [] }) => {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(() => {
    const counts = {};
    tasks.forEach(t => {
      const key = t.category || 'Uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([id, value]) => {
      const cat = categories.find(c => c.id === id);
      return { name: cat?.label || id, value, color: cat?.color || OTHER_SLOT.color };
    }).sort((a, b) => b.value - a.value);
  }, [tasks, categories]);

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-6">Task Category</h3>
      <div className="flex flex-col items-center">
        <SimpleDonutChart data={data} hovered={hovered} onHover={setHovered} />
        <div className="w-full mt-4 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
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

export default CategoryChart;

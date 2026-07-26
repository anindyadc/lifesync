import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Volume-based color stays in the indigo range so a busy-but-healthy day never
// reads the same as a failure; any day with a failed change is pushed straight
// to red regardless of volume, matching WalletWatch's DailyCalendar heat formula
// but with "has a failure" as the dominant signal instead of raw magnitude.
const INDIGO_RGB = [79, 70, 229];
const RED_RGB = [239, 68, 68];
const heatColor = (ratio) => {
  const [r1, g1, b1] = INDIGO_RGB;
  const [r2, g2, b2] = RED_RGB;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  const opacity = Math.min(0.18 + ratio * 0.72, 0.9);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const ActivityHeatmap = ({ changes = [], onDayClick }) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const [hovered, setHovered] = useState(null);

  const selectedMonth = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const { cells, maxVal, hasData } = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const byDay = new Map();
    changes.forEach(c => {
      const d = safeGetDate(c.date);
      if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, { count: 0, hasFailed: false });
      const bucket = byDay.get(day);
      bucket.count += 1;
      if (c.status === 'failed') bucket.hasFailed = true;
    });

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const dayCells = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const bucket = byDay.get(day);
      dayCells.push({
        day,
        date: new Date(year, month, day),
        count: bucket?.count || 0,
        hasFailed: bucket?.hasFailed || false,
        isToday: isCurrentMonth && today.getDate() === day,
      });
    }

    const max = Math.max(...dayCells.map(c => c.count), 1);
    return {
      cells: [...Array(firstWeekday).fill(null), ...dayCells],
      maxVal: max,
      hasData: dayCells.some(c => c.count > 0),
    };
  }, [changes, selectedMonth]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <CalendarIcon size={16} className="text-indigo-500" /> Change Activity
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(o => o - 1)} aria-label="Previous month" className="p-1 rounded hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-slate-500 w-24 text-center">
            {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setMonthOffset(o => o + 1)} aria-label="Next month" className="p-1 rounded hover:bg-slate-100 text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="inline-grid grid-cols-7 gap-[3px]">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="w-7 h-4 flex items-center justify-center text-[9px] font-bold text-slate-300 uppercase">{w[0]}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={`pad-${i}`} className="w-7 h-7" />;
          const ratio = c.hasFailed ? 1 : (c.count > 0 ? Math.min(0.1 + (c.count / maxVal) * 0.45, 0.55) : 0);
          return (
            <button
              key={c.day}
              type="button"
              disabled={c.count === 0}
              onClick={() => onDayClick?.(c.date)}
              onMouseEnter={() => setHovered(c.day)}
              onMouseLeave={() => setHovered(null)}
              title={`${c.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}${c.count > 0 ? ` · ${c.count} change${c.count !== 1 ? 's' : ''}${c.hasFailed ? ' (incl. failed)' : ''}` : ''}`}
              className={`relative w-7 h-7 rounded-sm transition-all z-0 hover:z-10 flex items-center justify-center ${c.count > 0 ? 'cursor-pointer hover:scale-125' : 'cursor-default'} ${c.isToday ? 'ring-1 ring-offset-1 ring-indigo-500' : ''}`}
              style={{ backgroundColor: c.count > 0 ? heatColor(ratio) : '#f1f5f9' }}
            >
              <span className={`text-[9px] font-bold ${c.count > 0 && ratio > 0.45 ? 'text-white' : 'text-slate-400'}`}>{c.day}</span>
              {hovered === c.day && c.count > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-lg pointer-events-none">
                  {c.count} change{c.count !== 1 ? 's' : ''}{c.hasFailed ? ' · failed' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!hasData && (
        <p className="text-xs text-slate-400 mt-4">No changes logged this month.</p>
      )}

      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-semibold text-slate-400">
        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/70" /> Activity
        <span className="w-2.5 h-2.5 rounded-sm bg-red-500 ml-2" /> Has failure
      </div>
    </div>
  );
};

export default ActivityHeatmap;

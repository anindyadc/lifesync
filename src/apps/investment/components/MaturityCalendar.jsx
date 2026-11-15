import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarDays } from 'lucide-react';
import { safeGetDate } from '../../../lib/utils';
import { isActiveHolding } from '../constants';

// FullCalendar CSS imports moved to index.css
import './MaturityCalendar.css'; // Import custom styles

// Same hues as the type badges in the holdings list.
const TYPE_COLORS = {
  FD: '#0284c7', TD: '#0d9488', NSC: '#7c3aed', 'Mutual Fund': '#059669', Stocks: '#ea580c',
  Smallcase: '#db2777', Gold: '#d97706', 'Real Estate': '#78716c',
};
const DEFAULT_COLOR = '#4f46e5';

const MaturityCalendar = ({ investments, onEdit }) => {
  const events = useMemo(() => investments.filter(isActiveHolding).map(inv => {
    // A missing/malformed maturityDate used to fall back to `new Date()`, making the
    // investment render as maturing *today* instead of being left off the calendar.
    const startDate = safeGetDate(inv.maturityDate);
    if (!startDate || isNaN(startDate.getTime())) return null;

    const eventName = inv.name ? String(inv.name) : 'Unnamed Investment';
    const eventAmount = inv.amount === null
      ? '⚠ Unable to decrypt'
      : (inv.amount ? `₹${inv.amount.toLocaleString('en-IN')}` : '₹0');
    const eventTitle = `${eventName} - ${eventAmount}`;

    return {
      id: inv.id,
      title: eventTitle,
      start: startDate,
      end: startDate,
      allDay: true,
      backgroundColor: TYPE_COLORS[inv.type] || DEFAULT_COLOR,
      borderColor: TYPE_COLORS[inv.type] || DEFAULT_COLOR,
      // You can add more properties here that FullCalendar can use
      extendedProps: { // Store original investment data if needed
        resource: inv,
      },
    };
  }).filter(Boolean), [investments]);

  const legendTypes = useMemo(() => [...new Set(investments.filter(isActiveHolding).filter(i => safeGetDate(i.maturityDate)).map(i => i.type))], [investments]);

  // FullCalendar options and callbacks
  const calendarOptions = {
    plugins: [dayGridPlugin, listPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listYear,listWeek,listDay' // Month view, and list views for Year, Week, Day
    },
    initialView: 'dayGridMonth',
    editable: false,
    selectable: false,
    weekends: true,
    eventClick: (info) => onEdit?.(info.event.extendedProps.resource),
    events: events,
    eventDisplay: 'block',
    eventColor: DEFAULT_COLOR,
    views: {
      listYear: {
        type: 'listYear',
        duration: { years: 1 },
        buttonText: 'Year'
      },
      listWeek: {
        type: 'listWeek',
        duration: { weeks: 1 },
        buttonText: 'Week'
      },
      listDay: {
        type: 'listDay',
        duration: { days: 1 },
        buttonText: 'Day'
      }
    }
  };

  return (
    <div className="maturity-calendar">
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">Legend</span>
          {legendTypes.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] || DEFAULT_COLOR }} />{t}
            </span>
          ))}
        </div>
      )}
      <div className="h-[640px]">
      {events.length > 0 ? (
        <FullCalendar
          {...calendarOptions}
          height="100%" // Ensure calendar takes full height of its container
        />
      ) : (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 h-full flex flex-col items-center justify-center">
          <CalendarDays size={40} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium">No upcoming maturities.</p>
          <p className="text-sm">Add investment to see them on the calendar.</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default MaturityCalendar;
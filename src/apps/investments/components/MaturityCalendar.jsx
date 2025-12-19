import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarDays } from 'lucide-react';

// FullCalendar CSS imports moved to index.css
import './MaturityCalendar.css'; // Import custom styles

const MaturityCalendar = ({ investments }) => {
  const events = investments.map(inv => {
    const startDate = inv.maturityDate ? new Date(inv.maturityDate) : new Date();
    const eventName = inv.name ? String(inv.name) : 'Unnamed Investment';
    const eventAmount = inv.amount ? `₹${inv.amount.toLocaleString('en-IN')}` : '₹0';
    const eventTitle = `${eventName} - ${eventAmount}`;

    return {
      id: inv.id,
      title: eventTitle,
      start: startDate,
      end: startDate,
      allDay: true,
      // You can add more properties here that FullCalendar can use
      extendedProps: { // Store original investment data if needed
        resource: inv,
      },
    };
  }).filter(event => !isNaN(event.start.getTime())); // Filter out events with invalid dates

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
    events: events,
    eventDisplay: 'block',
    eventColor: '#4F46E5', // Indigo color for events
    // eventContent: // You can customize event rendering further here if needed
    //   eventInfo => (
    //     <div className="fc-event-main-frame">
    //       <div className="fc-event-time">{eventInfo.timeText}</div>
    //       <div className="fc-event-title-container">
    //         <div className="fc-event-title fc-sticky">{eventInfo.event.title}</div>
    //       </div>
    //     </div>
    //   ),
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
    <div className="h-[600px]">
      {events.length > 0 ? (
        <FullCalendar
          {...calendarOptions}
          height="100%" // Ensure calendar takes full height of its container
        />
      ) : (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 h-full flex flex-col items-center justify-center">
          <CalendarDays size={40} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium">No upcoming maturities.</p>
          <p className="text-sm">Add investments to see them on the calendar.</p>
        </div>
      )}
    </div>
  );
};

export default MaturityCalendar;
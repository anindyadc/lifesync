import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const MaturityCalendar = ({ investments }) => {
  const events = investments.map(inv => {
    const startDate = inv.maturityDate ? new Date(inv.maturityDate) : new Date(); 
    const eventName = inv.name ? String(inv.name) : 'Unnamed Investment';
    const eventAmount = inv.amount ? `₹${inv.amount.toLocaleString('en-IN')}` : '₹0';
    const eventTitle = `${eventName} - ${eventAmount}`;
    return {
      title: eventTitle,
      start: startDate,
      end: startDate,
      allDay: true,
      resource: inv, 
    };
  }).filter(event => !isNaN(event.start.getTime()));

  const eventPropGetter = (event) => {
    const backgroundColor = '#4F46E5'; 
    const style = {
      backgroundColor,
      borderRadius: '7px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    return {
      style: style
    };
  };

  return (
    <div className="h-[600px]">
      {events.length > 0 ? (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor={(event) => event.start}
          endAccessor={(event) => event.end}
          style={{ height: '100%' }}
          views={['month', 'week', 'day', 'year']}
          defaultView="month"
          eventPropGetter={eventPropGetter}
          popup
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

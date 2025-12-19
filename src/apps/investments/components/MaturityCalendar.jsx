import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const MaturityCalendar = ({ investments }) => {
  const events = investments.map(inv => ({
    title: `${inv.name} - ₹${inv.amount?.toLocaleString('en-IN')}`,
    start: new Date(inv.maturityDate),
    end: new Date(inv.maturityDate),
    allDay: true,
    resource: inv, // Attach full investment object if needed
  }));

  const eventPropGetter = (event) => {
    const backgroundColor = '#4F46E5'; // A nice indigo color
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
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={['month', 'week', 'day']}
        defaultView="month"
        eventPropGetter={eventPropGetter}
        popup
      />
    </div>
  );
};

export default MaturityCalendar;

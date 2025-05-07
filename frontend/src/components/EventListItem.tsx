import React from 'react';
import { Event } from '../types';

interface EventListItemProps {
  event: Event;
}

function formatEventDateTime(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };
  if (isSameDay) {
    return `${formatDate(startDate)}, ${formatTime(startDate)} to ${formatTime(endDate)}`;
  } else {
    return `${formatDate(startDate)} at ${formatTime(startDate)} to ${formatDate(endDate)} at ${formatTime(endDate)}`;
  }
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `Duration: ${hours}h ${mins}m`;
}

const EventListItem: React.FC<EventListItemProps> = ({ event }) => (
  <div className="event-item">
    <div className="event-summary">{event.summary}</div>
    <div className="event-details">
      <span className="event-time">{formatEventDateTime(event.start.dateTime, event.end.dateTime)}</span>
      <span className="event-duration">{formatDuration(event.duration)}</span>
    </div>
  </div>
);

export default EventListItem; 
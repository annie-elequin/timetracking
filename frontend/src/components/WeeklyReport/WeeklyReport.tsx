import React from 'react';
import './WeeklyReport.css';
import { Event } from '../../types';
import EventListItem from '../EventListItem';

interface WeeklyReportProps {
  events: Event[];
  selectedTags: string[];
  startDate: Date;
  endDate: Date;
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function WeeklyReport({ events, selectedTags, startDate, endDate }: WeeklyReportProps) {
  // Group events by tag
  const groupedEvents = events.reduce((groups: { [key: string]: Event[] }, event) => {
    event.projectTags?.forEach((projectTag) => {
      const tag = projectTag.tag;
      if (selectedTags.includes(tag)) {
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push(event);
      }
    });
    return groups;
  }, {});

  // Calculate total duration for each tag
  const tagTotals = Object.entries(groupedEvents).reduce((totals: { [key: string]: number }, [tag, events]) => {
    totals[tag] = events.reduce((sum, event) => sum + (event.duration || 0), 0);
    return totals;
  }, {});

  // Calculate grand total
  const grandTotal = Object.values(tagTotals).reduce((sum, duration) => sum + duration, 0);

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric',
      year: start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  return (
    <div className="weekly-report">
      <header className="report-header">
        <h1>Weekly Activity Report</h1>
        <div className="report-meta">
          <p className="date-range">{formatDateRange(startDate, endDate)}</p>
          <p className="total-time">Total Time: {formatDuration(grandTotal)}</p>
        </div>
      </header>

      <div className="report-content">
        {Object.entries(groupedEvents).map(([tag, tagEvents]) => (
          <section key={tag} className="tag-section">
            <div className="tag-header">
              <h2>{tag.charAt(0).toUpperCase() + tag.slice(1)}</h2>
              <span className="tag-total">{formatDuration(tagTotals[tag])}</span>
            </div>
            
            <div className="events-list">
              {tagEvents.map(event => (
                <EventListItem key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default WeeklyReport; 
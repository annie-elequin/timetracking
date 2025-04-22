import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';
import WeeklyReport from './components/WeeklyReport/WeeklyReport.tsx';
import BouncingLogo from './components/BouncingLogo/BouncingLogo.tsx';
import HelpModal from './components/HelpModal/HelpModal.tsx';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectTags?: { tag: string; description: string }[];
  duration?: number;
}

interface GroupedEvents {
  [key: string]: {
    events: Event[];
    totalDuration: number;
  };
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL?: string;
    }
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate start of week (Sunday)
  const start = new Date(now);
  start.setDate(now.getDate() - currentDay);
  start.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Saturday)
  const end = new Date(now);
  end.setDate(now.getDate() + (6 - currentDay));
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [groupByTag, setGroupByTag] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showReport, setShowReport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${apiUrl}/auth/status`);
        setIsAuthenticated(response.data.isAuthenticated);
        setUserEmail(response.data.email || null);
        if (response.data.isAuthenticated) {
          fetchEvents();
          fetchTags();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setLoading(false);
      }
    };

    const fetchEvents = async () => {
      try {
        const params = {
          ...(selectedTags.length > 0 ? { projectTags: selectedTags } : {}),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
        const response = await axios.get(`${apiUrl}/api/events`, { params });
        setEvents(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to fetch events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/events/tags`);
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    checkAuthStatus();
  }, [apiUrl, selectedTags, startDate, endDate]);

  const handleGoogleAuth = () => {
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      const isSelected = prev.includes(tag);
      if (isSelected) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const groupEventsByTag = (events: Event[]): GroupedEvents => {
    return events.reduce((groups: GroupedEvents, event) => {
      event.projectTags?.forEach(({ tag }) => {
        if (!groups[tag]) {
          groups[tag] = { events: [], totalDuration: 0 };
        }
        groups[tag].events.push(event);
        groups[tag].totalDuration += event.duration || 0;
      });
      return groups;
    }, {});
  };

  const renderEvent = (event: Event) => (
    <li key={event.id} className="event">
      <h3>{event.summary}</h3>
      <div className="event-details">
        <p className="time">
          {formatEventDateTime(event.start.dateTime, event.end.dateTime)}
        </p>
        {event.duration && (
          <p className="duration">
            Duration: {formatDuration(event.duration)}
          </p>
        )}
      </div>
    </li>
  );

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setEndDate(date);
    }
  };

  const setThisWeek = () => {
    const { start, end } = getWeekRange();
    setStartDate(start);
    setEndDate(end);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${apiUrl}/auth/logout`);
      setIsAuthenticated(false);
      setUserEmail(null);
      setEvents([]);
      setAvailableTags([]);
      setSelectedTags([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (showReport) {
    return (
      <WeeklyReport
        events={events}
        selectedTags={selectedTags}
        startDate={startDate}
        endDate={endDate}
      />
    );
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const groupedEvents = groupByTag ? groupEventsByTag(events) : null;

  return (
    <div className="App">
      <BouncingLogo isAuthenticated={isAuthenticated} />
      <header>
        <div className="header-left">
          <h1>Time Tracking</h1>
          {isAuthenticated && userEmail && (
            <div className="user-email">{userEmail}</div>
          )}
        </div>
        <div className="header-buttons">
          {!isAuthenticated ? (
            <button onClick={handleGoogleAuth}>Connect Google Calendar</button>
          ) : (
            <button 
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          )}
          <button 
            className="help-button"
            onClick={() => setShowHelp(true)}
            title="Help"
          >
            ?
          </button>
        </div>
      </header>
      <main>
        {!isAuthenticated ? (
          <div className="auth-prompt">
            <h2>Welcome to Time Tracking</h2>
            <p>Please connect your Google Calendar to get started.</p>
          </div>
        ) : (
          <>
            <div className="controls">
              <h2>Calendar Events</h2>
              <div className="control-group">
                <div className="date-controls">
                  <div className="date-range">
                    <DatePicker
                      selected={startDate}
                      onChange={handleStartDateChange}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      maxDate={endDate}
                      className="date-picker"
                      placeholderText="Start Date"
                    />
                    <span>to</span>
                    <DatePicker
                      selected={endDate}
                      onChange={handleEndDateChange}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      maxDate={new Date()}
                      className="date-picker"
                      placeholderText="End Date"
                    />
                  </div>
                  <button 
                    className="this-week-button"
                    onClick={setThisWeek}
                  >
                    This Week
                  </button>
                </div>
                <div className="view-controls">
                  <label className="group-toggle">
                    <input
                      type="checkbox"
                      checked={groupByTag}
                      onChange={(e) => setGroupByTag(e.target.checked)}
                    />
                    Group by tag
                  </label>
                  {selectedTags.length > 0 && (
                    <button
                      className="generate-report-button"
                      onClick={() => setShowReport(true)}
                    >
                      Generate Report
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {availableTags.length > 0 && (
              <div className="tag-filter">
                <h3>Project Tags</h3>
                <div className="tags">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      className={`tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {error ? (
              <div className="error">{error}</div>
            ) : events.length === 0 ? (
              <p>No events found in your calendar.</p>
            ) : groupByTag ? (
              <div className="grouped-events">
                {Object.entries(groupedEvents!).map(([tag, { events, totalDuration }]) => (
                  <div key={tag} className="tag-group">
                    <h3 className="tag-header">
                      #{tag}
                      <span className="total-duration">
                        Total: {formatDuration(totalDuration)}
                      </span>
                    </h3>
                    <ul className="events">
                      {events.map(renderEvent)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="events">
                {events.map(renderEvent)}
              </ul>
            )}
          </>
        )}
      </main>
      <footer className="version-footer">
        v1.0.2
      </footer>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App; 
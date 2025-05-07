import { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';
import WeeklyReport from './components/WeeklyReport/WeeklyReport';
import BouncingLogo from './components/BouncingLogo/BouncingLogo';
import HelpModal from './components/HelpModal/HelpModal';
import { VERSION } from './constants';
import { Event } from './types';
import EventListItem from './components/EventListItem';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

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
  const [isTestUser, setIsTestUser] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [groupByTag, setGroupByTag] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() => {
    const { start } = getWeekRange();
    return start;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const { end } = getWeekRange();
    return end;
  });
  const [showReport, setShowReport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const apiUrl = window.env?.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        // Check for test token first
        const cookies = document.cookie.split(';');
        const testToken = cookies.find(cookie => cookie.trim().startsWith('access_token=test-token-123'));
        
        if (testToken) {
          setIsTestUser(true);
          setIsAuthenticated(true);
          setUserEmail('test@example.com');
          // Set mock data for test user
          setEvents([
            {
              id: 'test1',
              summary: 'Test Meeting 1',
              start: { dateTime: new Date().toISOString() },
              end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
              projectTags: [{ _id: '1', tag: 'test-project', description: 'Test Project', userId: 'test-user' }],
              duration: 60
            },
            {
              id: 'test2',
              summary: 'Test Meeting 2',
              start: { dateTime: new Date(Date.now() - 7200000).toISOString() },
              end: { dateTime: new Date(Date.now() - 3600000).toISOString() },
              projectTags: [{ _id: '2', tag: 'demo', description: 'Demo Project', userId: 'test-user' }],
              duration: 120
            }
          ]);
          setAvailableTags(['test-project', 'demo']);
          setLoading(false);
          return;
        }

        // Not a test user, check real auth status
        const response = await axios.get(`${apiUrl}/auth/status`);
        setIsTestUser(false);
        setIsAuthenticated(response.data.isAuthenticated);
        setUserEmail(response.data.email || null);
        
        if (response.data.isAuthenticated) {
          // Fetch real data
          const params = {
            ...(selectedTags.length > 0 ? { projectTags: selectedTags } : {}),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          };
          const [eventsResponse, tagsResponse] = await Promise.all([
            axios.get(`${apiUrl}/api/events`, { params }),
            axios.get(`${apiUrl}/api/events/tags`)
          ]);
          setEvents(eventsResponse.data);
          setAvailableTags(tagsResponse.data);
        }
      } catch (error) {
        console.error('Error in auth/data check:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [apiUrl, selectedTags, startDate, endDate]);

  const handleGoogleAuth = () => {
    const authUrl = `${apiUrl}/auth/google`;
    window.location.replace(authUrl);
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
      event.projectTags?.forEach((projectTag) => {
        const tag = projectTag.tag;
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
    <li key={event.id}>
      <EventListItem event={event} />
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
      if (!isTestUser) {
        await axios.post(`${apiUrl}/auth/logout`);
      } else {
        // Remove test token cookie
        document.cookie = 'access_token=test-token-123; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setIsAuthenticated(false);
      setUserEmail(null);
      setIsTestUser(false);
      setEvents([]);
      setAvailableTags([]);
      setSelectedTags([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Dismiss weekly report with Backspace key
  useEffect(() => {
    if (!showReport) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        setShowReport(false);
        setSelectedTags([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showReport]);

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
            <div className="auth-prompt">
              <h2>Welcome to Time Tracking</h2>
              <p>Please connect your Google Calendar to get started.</p>
              <div className="auth-buttons">
                <button onClick={handleGoogleAuth}>Connect Google Calendar</button>
                <button 
                  onClick={() => {
                    console.log('Test user login button clicked');
                    // Set test user cookie with explicit expiration
                    document.cookie = `access_token=test-token-123; path=/; domain=localhost; max-age=3600`;
                    console.log('Set test token cookie, reloading page');
                    // Refresh the page to trigger auth check
                    window.location.reload();
                  }}
                  className="test-user-button"
                >
                  Login as Test User
                </button>
              </div>
            </div>
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
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
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
        v{VERSION}
      </footer>
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App; 
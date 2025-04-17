import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectTags?: { tag: string; description: string }[];
  duration?: number;
}

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${apiUrl}/auth/status`);
        setIsAuthenticated(response.data.isAuthenticated);
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
        const params = selectedTag ? { projectTag: selectedTag } : {};
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
  }, [apiUrl, selectedTag]);

  const handleGoogleAuth = () => {
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Time Tracking</h1>
        {!isAuthenticated && (
          <button onClick={handleGoogleAuth}>Connect Google Calendar</button>
        )}
      </header>
      <main>
        {!isAuthenticated ? (
          <div className="auth-prompt">
            <h2>Welcome to Time Tracking</h2>
            <p>Please connect your Google Calendar to get started.</p>
          </div>
        ) : (
          <>
            <h2>Calendar Events</h2>
            {availableTags.length > 0 && (
              <div className="tag-filter">
                <h3>Project Tags</h3>
                <div className="tags">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      className={`tag ${selectedTag === tag ? 'active' : ''}`}
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
            ) : (
              <ul className="events">
                {events.map((event) => (
                  <li key={event.id} className="event">
                    <h3>{event.summary}</h3>
                    {event.description && <p>{event.description}</p>}
                    {event.projectTags && event.projectTags.length > 0 && (
                      <div className="tags">
                        {event.projectTags.map(({ tag, description }) => (
                          <span key={tag} className="tag">
                            #{tag}
                            {description && <span className="tag-description">: {description}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="time">
                      {new Date(event.start.dateTime).toLocaleString()} -{' '}
                      {new Date(event.end.dateTime).toLocaleString()}
                    </p>
                    {event.duration && (
                      <p className="duration">
                        Duration: {Math.floor(event.duration / 60)}h {event.duration % 60}m
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App; 
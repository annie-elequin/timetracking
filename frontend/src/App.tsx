import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${apiUrl}/auth/status`);
        setIsAuthenticated(response.data.isAuthenticated);
        if (response.data.isAuthenticated) {
          fetchEvents();
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
        const response = await axios.get(`${apiUrl}/api/events`);
        setEvents(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to fetch events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [apiUrl]);

  const handleGoogleAuth = () => {
    window.location.href = `${apiUrl}/auth/google`;
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
            {error ? (
              <div className="error">{error}</div>
            ) : events.length === 0 ? (
              <p>No events found in your calendar.</p>
            ) : (
              <ul>
                {events.map((event) => (
                  <li key={event.id}>
                    <h3>{event.summary}</h3>
                    <p>{event.description}</p>
                    <p>
                      {new Date(event.start.dateTime).toLocaleString()} -{' '}
                      {new Date(event.end.dateTime).toLocaleString()}
                    </p>
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
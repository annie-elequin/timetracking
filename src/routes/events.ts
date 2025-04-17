import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const router = Router();

export const initEventsRoutes = (oauth2Client: OAuth2Client, tokens: () => any) => {
  router.get('/', async (req, res) => {
    try {
      const currentTokens = tokens();
      if (!currentTokens) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      oauth2Client.setCredentials(currentTokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      res.json(response.data.items);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  return router;
}; 
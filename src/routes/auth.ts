import { Router, Request, Response } from 'express';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';

const router = Router();

// Store tokens in memory (for development)
let tokens: Credentials | null = null;

export const getTokens = () => tokens;

export const initAuthRoutes = (oauth2Client: OAuth2Client, isProduction: boolean) => {
  router.get('/status', (req: Request, res: Response) => {
    res.json({ isAuthenticated: !!tokens });
  });

  router.get('/google', (req: Request, res: Response) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly']
    });
    res.redirect(url);
  });

  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }
      const { tokens: newTokens } = await oauth2Client.getToken(code);
      tokens = newTokens;
      oauth2Client.setCredentials(tokens);
      
      if (isProduction) {
        res.redirect('https://timetracking.elequin.io');
      } else {
        res.redirect('http://localhost:3001');
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  router.get('/events', async (_req: Request, res: Response) => {
    try {
      if (!tokens) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      oauth2Client.setCredentials(tokens);
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
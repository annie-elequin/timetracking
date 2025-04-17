import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParsedQs } from 'qs';
import cookieParser from 'cookie-parser';

dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'ENCRYPTION_KEY',
  'MONGODB_URI',
  'DEV_GOOGLE_CLIENT_ID',
  'DEV_GOOGLE_CLIENT_SECRET',
  'DEV_GOOGLE_REDIRECT_URI'
];

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push(
    'PROD_GOOGLE_CLIENT_ID',
    'PROD_GOOGLE_CLIENT_SECRET',
    'PROD_GOOGLE_REDIRECT_URI'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProduction ? 'https://timetracking.elequin.io' : 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Google Calendar API setup
const oauth2Client = new OAuth2Client(
  isProduction ? process.env.PROD_GOOGLE_CLIENT_ID : process.env.DEV_GOOGLE_CLIENT_ID,
  isProduction ? process.env.PROD_GOOGLE_CLIENT_SECRET : process.env.DEV_GOOGLE_CLIENT_SECRET,
  isProduction ? process.env.PROD_GOOGLE_REDIRECT_URI : process.env.DEV_GOOGLE_REDIRECT_URI
);

// Store tokens in memory (for development)
let tokens: any = null;

// Type definitions for route parameters
type EmptyParams = Record<string, never>;
type EmptyBody = Record<string, never>;
type EmptyQuery = Record<string, never>;

interface AuthCallbackQuery extends ParsedQs {
  code?: string;
}

// Routes
app.get('/auth/status', (_req: Request<EmptyParams, any, EmptyBody, EmptyQuery>, res: Response) => {
  res.json({ isAuthenticated: !!tokens });
});

app.get('/auth/google', (_req: Request<EmptyParams, any, EmptyBody, EmptyQuery>, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly']
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req: Request<EmptyParams, any, EmptyBody, AuthCallbackQuery>, res: Response) => {
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

app.get('/api/events', async (_req: Request<EmptyParams, any, EmptyBody, EmptyQuery>, res: Response) => {
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

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
}); 
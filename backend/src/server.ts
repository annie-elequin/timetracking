import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParsedQs } from 'qs';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { Event } from './models/Event';

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

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProduction ? 'https://timetracking.elequin.io' : 'http://localhost:3001',
  credentials: true,
  exposedHeaders: ['set-cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Google Calendar API setup
const oauth2Client = new OAuth2Client(
  isProduction ? process.env.PROD_GOOGLE_CLIENT_ID : process.env.DEV_GOOGLE_CLIENT_ID,
  isProduction ? process.env.PROD_GOOGLE_CLIENT_SECRET : process.env.DEV_GOOGLE_CLIENT_SECRET,
  isProduction ? process.env.PROD_GOOGLE_REDIRECT_URI : process.env.DEV_GOOGLE_REDIRECT_URI
);

// Type definitions for route parameters
type EmptyParams = Record<string, never>;
type EmptyBody = Record<string, never>;
type EmptyQuery = Record<string, never>;

interface AuthCallbackQuery extends ParsedQs {
  code?: string;
}

// Routes
app.get('/auth/status', (req: Request, res: Response) => {
  const authTokens = req.cookies.auth_tokens;
  res.json({ isAuthenticated: !!authTokens });
});

app.get('/auth/google', (_req: Request<EmptyParams, any, EmptyBody, EmptyQuery>, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
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
    
    // Store tokens in an HTTP-only cookie that expires in 7 days
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to false for local development
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
    
    res.cookie('auth_tokens', JSON.stringify(newTokens), cookieOptions);
    
    // Add a small delay before redirect to ensure cookie is set
    setTimeout(() => {
      if (isProduction) {
        res.redirect('https://timetracking.elequin.io');
      } else {
        res.redirect('http://localhost:3001');
      }
    }, 100);
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const authTokens = req.cookies.auth_tokens;
    if (!authTokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokens = JSON.parse(authTokens);
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get date range from query parameters or use default (7 days ago)
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    })();
    
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Extract tags from event summaries and store events in MongoDB
    const events = response.data.items?.map(event => {
      const summary = event.summary || '';
      
      const tagRegex = /#(\w+)/g;  // Simplified regex to just capture hashtag words
      const matches = summary.match(tagRegex) || [];
      const projectTags = matches.map(tag => ({
        tag: tag.slice(1),  // Remove the # from the tag
        description: ''     // We don't need descriptions since they're not in the summary
      }));

      // Calculate duration in minutes
      const startTime = new Date(event.start?.dateTime || event.start?.date || '');
      const endTime = new Date(event.end?.dateTime || event.end?.date || '');
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      return {
        ...event,
        projectTags,
        duration: durationMinutes
      };
    }) || [];

    // Filter to only include events that have hashtags
    const taggedEvents = events.filter(event => event.projectTags.length > 0);

    // Store events in MongoDB
    await Promise.all(taggedEvents.map(event => 
      Event.findOneAndUpdate(
        { googleEventId: event.id },
        {
          googleEventId: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          projectTags: event.projectTags,
          duration: event.duration
        },
        { upsert: true }
      )
    ));

    res.json(taggedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Add tags endpoint
app.get('/api/events/tags', async (_req: Request, res: Response) => {
  try {
    const events = await Event.find({});
    const tags = new Set<string>();
    
    events.forEach(event => {
      const summary = event.summary || '';
      const tagRegex = /#(\w+)/g;
      const matches = summary.match(tagRegex) || [];
      matches.forEach(tag => tags.add(tag.slice(1))); // Remove # from tag
    });
    
    res.json(Array.from(tags));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
}); 
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

app.get('/api/events', async (req: Request, res: Response) => {
  try {
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Calculate timeMin to include events from 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('Fetching events since:', sevenDaysAgo.toISOString());
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: sevenDaysAgo.toISOString(),
      maxResults: 100, // Increased to show more events
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log('Total events fetched:', response.data.items?.length || 0);

    // Extract tags from event summaries and store events in MongoDB
    const events = response.data.items?.map(event => {
      const summary = event.summary || '';
      console.log('Event:', summary);
      
      const tagRegex = /#(\w+)/g;  // Simplified regex to just capture hashtag words
      const matches = summary.match(tagRegex) || [];
      const projectTags = matches.map(tag => ({
        tag: tag.slice(1),  // Remove the # from the tag
        description: ''     // We don't need descriptions since they're not in the summary
      }));

      console.log('Found tags:', projectTags);

      return {
        ...event,
        projectTags
      };
    }) || [];

    // Filter to only include events that have hashtags
    const taggedEvents = events.filter(event => event.projectTags.length > 0);
    console.log('Events with tags:', taggedEvents.length);

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
          projectTags: event.projectTags
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
      const description = event.description || '';
      const tagRegex = /#(\w+)/g;
      const matches = description.match(tagRegex) || [];
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
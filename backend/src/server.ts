import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParsedQs } from 'qs';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { Event } from './models/Event';
import { initAuthRoutes } from './routes/auth';
import { getMongoDBUri } from './config/database';

dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'ENCRYPTION_KEY',
  'MONGO_ROOT_USERNAME',
  'MONGO_ROOT_PASSWORD'
];

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push(
    'PROD_GOOGLE_CLIENT_ID',
    'PROD_GOOGLE_CLIENT_SECRET',
    'PROD_GOOGLE_REDIRECT_URI'
  );
} else {
  requiredEnvVars.push(
    'DEV_GOOGLE_CLIENT_ID',
    'DEV_GOOGLE_CLIENT_SECRET',
    'DEV_GOOGLE_REDIRECT_URI'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// MongoDB connection
const mongoUri = getMongoDBUri();
console.log('Attempting to connect to MongoDB...');
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    console.error('Connection details:', {
      uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'), // Mask credentials
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
  });

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProduction ? ['https://timetracking.elequin.io', 'https://accounts.google.com'] : 'http://localhost:3001',
  credentials: true,
  exposedHeaders: ['set-cookie'],
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json());
app.use(cookieParser());

// Google Calendar API setup
console.log('Initializing OAuth client with:', {
  isProduction,
  clientId: isProduction ? process.env.PROD_GOOGLE_CLIENT_ID : process.env.DEV_GOOGLE_CLIENT_ID,
  redirectUri: isProduction ? process.env.PROD_GOOGLE_REDIRECT_URI : process.env.DEV_GOOGLE_REDIRECT_URI,
  hasClientSecret: !!(isProduction ? process.env.PROD_GOOGLE_CLIENT_SECRET : process.env.DEV_GOOGLE_CLIENT_SECRET)
});

const oauth2Client = new OAuth2Client(
  isProduction ? process.env.PROD_GOOGLE_CLIENT_ID : process.env.DEV_GOOGLE_CLIENT_ID,
  isProduction ? process.env.PROD_GOOGLE_CLIENT_SECRET : process.env.DEV_GOOGLE_CLIENT_SECRET,
  isProduction ? process.env.PROD_GOOGLE_REDIRECT_URI : process.env.DEV_GOOGLE_REDIRECT_URI
);

// Initialize auth routes
app.use('/auth', initAuthRoutes(oauth2Client, isProduction));

// Type definitions for route parameters
type EmptyParams = Record<string, never>;
type EmptyBody = Record<string, never>;
type EmptyQuery = Record<string, never>;

interface AuthCallbackQuery extends ParsedQs {
  code?: string;
}

// Routes
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    oauth2Client.setCredentials({ access_token: accessToken });
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
          duration: event.duration
        },
        { upsert: true }
      )
    ));

    res.json(taggedEvents);
  } catch (error) {
    console.error('Server.ts: Error fetching events:', error);
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

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      },
      services: {
        mongodb: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          readyState: mongoose.connection.readyState
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        requiredEnvVars: requiredEnvVars.every(varName => !!process.env[varName]) ? 'all present' : 'missing some'
      }
    };

    // Check if any critical service is down
    const isHealthy = health.services.mongodb.status === 'connected' && 
                     health.environment.requiredEnvVars === 'all present';

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
}); 
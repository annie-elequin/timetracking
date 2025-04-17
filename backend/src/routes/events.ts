import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Event } from '../models/Event';

const router = Router();

// Helper function to extract project tags and their descriptions from description
const extractProjectTags = (description: string | null | undefined): { tag: string; description: string }[] => {
  if (!description) return [];
  const tagRegex = /#(\w+)(?:\s+(.+?))(?=\s+#|$)/g;
  const matches = [...description.matchAll(tagRegex)];
  return matches.map(match => ({
    tag: match[1],
    description: match[2]?.trim() || ''
  }));
};

export const initEventsRoutes = (oauth2Client: OAuth2Client, tokens: () => any) => {
  router.get('/', async (req: Request, res: Response) => {
    try {
      const currentTokens = tokens();
      if (!currentTokens) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { projectTag } = req.query;
      const timeMin = req.query.timeMin as string || new Date().toISOString();
      const maxResults = req.query.maxResults || 10;

      oauth2Client.setCredentials(currentTokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        maxResults: Number(maxResults),
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Process events and extract project tags with descriptions
      const events = response.data.items?.map(event => {
        const projectTags = extractProjectTags(event.description);
        return {
          ...event,
          projectTags,
          // Store the event in our database
          _id: event.id,
          googleEventId: event.id,
          start: new Date(event.start?.dateTime || event.start?.date || ''),
          end: new Date(event.end?.dateTime || event.end?.date || ''),
          duration: Math.round(
            (new Date(event.end?.dateTime || event.end?.date || '').getTime() -
            new Date(event.start?.dateTime || event.start?.date || '').getTime()) / (1000 * 60)
          ),
        };
      }) || [];

      // Filter by project tag if specified
      const filteredEvents = projectTag
        ? events.filter(event => event.projectTags.some(tag => tag.tag === projectTag))
        : events;

      // Store events in our database
      await Event.bulkWrite(
        events.map(event => ({
          updateOne: {
            filter: { googleEventId: event.googleEventId },
            update: { $set: event },
            upsert: true,
          },
        }))
      );

      res.json(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Get all unique project tags
  router.get('/tags', async (_req: Request, res: Response) => {
    try {
      const tags = await Event.distinct('projectTags.tag');
      res.json(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  return router;
}; 
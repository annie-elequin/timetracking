import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { Event } from '../models/Event';
import { ProjectTag } from '../models/ProjectTag';
import { User } from '../models/User';

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

      // Get user from session/token
      const user = await User.findOne({ email: currentTokens.email });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
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
        // Extract tags from description for lookup/creation only
        const extractedTags = extractProjectTags(event.description);
        return {
          ...event,
          extractedTags, // temporary, not for DB
          userId: user._id,
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
        ? events.filter(event => event.extractedTags.some(tag => tag.tag === projectTag))
        : events;

      // Store events and create/update project tags
      for (const event of events) {
        // Create/update project tags and get their ObjectIds
        const tagIds = await Promise.all(
          (event.extractedTags || []).map(async ({ tag, description }) => {
            const projectTag = await ProjectTag.findOneAndUpdate(
              { userId: user._id, tag },
              { userId: user._id, tag, description },
              { upsert: true, new: true }
            );
            return projectTag._id;
          })
        );

        // Explicitly set only the fields we want to update
        await Event.findOneAndUpdate(
          { googleEventId: event.googleEventId },
          {
            userId: event.userId,
            googleEventId: event.googleEventId,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            duration: event.duration,
            projectTags: tagIds
          },
          { upsert: true }
        );
      }

      // Populate project tags for response
      const populatedEvents = await Event.find({
        googleEventId: { $in: filteredEvents.map(e => e.googleEventId) }
      }).populate('projectTags');

      res.json(populatedEvents);
    } catch (error) {
      console.error('Events.ts: Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Get all unique project tags for the current user
  router.get('/tags', async (req: Request, res: Response) => {
    try {
      const currentTokens = tokens();
      if (!currentTokens) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findOne({ email: currentTokens.email });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const tags = await ProjectTag.find({ userId: user._id });
      res.json(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  return router;
}; 
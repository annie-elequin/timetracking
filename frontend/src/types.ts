export interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectTags?: { tag: string; description: string }[];
  duration?: number;
} 
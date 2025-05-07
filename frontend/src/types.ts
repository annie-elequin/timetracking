export interface ProjectTag {
  _id: string;
  tag: string;
  description: string;
  userId?: string;
}

export interface Event {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectTags?: ProjectTag[];
  duration?: number;
} 
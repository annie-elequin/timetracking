import mongoose, { Document, Schema } from 'mongoose';

interface ProjectTag {
  tag: string;
  description: string;
}

export interface IEvent extends Document {
  googleEventId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  projectTags: ProjectTag[];
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTagSchema = new Schema<ProjectTag>({
  tag: { type: String, required: true },
  description: { type: String, default: '' }
});

const EventSchema = new Schema<IEvent>(
  {
    googleEventId: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    description: String,
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    projectTags: [ProjectTagSchema],
    duration: { type: Number, required: true }, // stored in minutes
  },
  {
    timestamps: true,
  }
);

// Calculate duration before saving
EventSchema.pre('save', function(next) {
  if (this.start && this.end) {
    this.duration = Math.round((this.end.getTime() - this.start.getTime()) / (1000 * 60));
  }
  next();
});

export const Event = mongoose.model<IEvent>('Event', EventSchema); 
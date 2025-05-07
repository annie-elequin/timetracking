import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  userId: mongoose.Types.ObjectId;
  googleEventId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  projectTags: mongoose.Types.ObjectId[]; // References to ProjectTag documents
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    googleEventId: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    description: String,
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    projectTags: [{ type: Schema.Types.ObjectId, ref: 'ProjectTag' }],
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
import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectTag extends Document {
  userId: mongoose.Types.ObjectId;
  tag: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTagSchema = new Schema<IProjectTag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tag: { type: String, required: true },
    description: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

// Create a compound index to ensure tag uniqueness per user
ProjectTagSchema.index({ userId: 1, tag: 1 }, { unique: true });

export const ProjectTag = mongoose.model<IProjectTag>('ProjectTag', ProjectTagSchema); 
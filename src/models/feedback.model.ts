// src/models/feedback.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedbackReaction extends Document {
  user: mongoose.Types.ObjectId;
  feedback: mongoose.Types.ObjectId;
  action: 'LIKE' | 'DISLIKE';
  createdAt: Date;
}


export interface IFeedback extends Document {
  user: mongoose.Types.ObjectId;
  type: 'BUG' | 'FEATURE' | 'GENERAL';
  content: string;
  images: string[];
  referenceUrl?: string;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
}

const FeedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    type: { type: String, enum: ['BUG', 'FEATURE', 'GENERAL'], required: true },
    content: { type: String, required: true, maxlength: 1000, trim: true },
    images: { type: [{ type: String }], validate: [arrayLimit, 'Exceeds 3 images'] },
    referenceUrl: { type: String, match: [/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i, 'Invalid URL'] },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function arrayLimit(val: string[]) {
  return val.length <= 3;
}

const FeedbackReactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    feedback: { type: Schema.Types.ObjectId, ref: 'feedback', required: true },
    action: { type: String, enum: ['LIKE', 'DISLIKE'], required: true },
  },
  { timestamps: true }
);


FeedbackReactionSchema.index({ user: 1, feedback: 1 }, { unique: true });

export const FeedbackReactionModel = mongoose.model<IFeedbackReaction>('feedback_reaction', FeedbackReactionSchema);
export const FeedbackModel = mongoose.model<IFeedback>('feedback', FeedbackSchema);
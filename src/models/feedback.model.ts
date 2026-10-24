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

function arrayLimit(val: string[]) {
  return val.length <= 3;
}

// Reusable transform function for both schemas
const transformOptions = {
  transform: function (doc: any, ret: any) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    if ('__v' in ret) delete ret.__v;
  }
};

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
  {
    timestamps: true,
    toJSON: transformOptions,
    toObject: transformOptions
  }
);

const FeedbackReactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    feedback: { type: Schema.Types.ObjectId, ref: 'feedback', required: true },
    action: { type: String, enum: ['LIKE', 'DISLIKE'], required: true },
  },
  {
    timestamps: true,
    toJSON: transformOptions,
    toObject: transformOptions
  }
);

FeedbackReactionSchema.index({ user: 1, feedback: 1 }, { unique: true });

export const FeedbackReactionModel = mongoose.model<IFeedbackReaction>('feedback_reaction', FeedbackReactionSchema);
export const FeedbackModel = mongoose.model<IFeedback>('feedback', FeedbackSchema);
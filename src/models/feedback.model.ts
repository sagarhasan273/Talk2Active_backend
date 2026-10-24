import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId;
    type: 'BUG' | 'FEATURE' | 'GENERAL';
    content: string;
    images: string[]; // Array of image URLs (uploaded to S3/Cloudinary)
    referenceUrl?: string; // Optional URL field
    likes: mongoose.Types.ObjectId[];
    dislikes: mongoose.Types.ObjectId[];
    createdAt: Date;
}

const FeedbackSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
        type: { type: String, enum: ['BUG', 'FEATURE', 'GENERAL'], required: true },
        content: {
            type: String,
            required: true,
            maxlength: 1000,
            trim: true
        },
        images: {
            type: [{ type: String }],
            validate: [arrayLimit, 'Exceeds the limit of 3 images']
        },
        referenceUrl: {
            type: String,
            match: [/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i, 'Invalid URL format']
        },
        likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

function arrayLimit(val: string[]) {
    return val.length <= 3;
}

export const FeedbackModel = mongoose.model<IFeedback>('feedback', FeedbackSchema);
import mongoose, { Document, Schema } from "mongoose";

interface IBlockedUser extends Document {
    blockerId: mongoose.Types.ObjectId;
    blockedId: mongoose.Types.ObjectId;
    createdAt: Date;
    reason?: string;
}

const BlockedUserSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    blockedAt: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        enum: ['spam', 'harassment', 'other'],
        default: 'other'
    }
}, { _id: false });

// Add compound index to prevent duplicate blocks
BlockedUserSchema.index(
    { userId: 1 },
    { unique: true }
);

// Optional: Index for querying who blocked a specific user
BlockedUserSchema.index({ blockedId: 1 });

export const BlockedUser = mongoose.model<IBlockedUser>(
    "blockedUsers",
    BlockedUserSchema
);
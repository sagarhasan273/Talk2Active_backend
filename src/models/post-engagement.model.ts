import mongoose, { Schema } from "mongoose";
import { LikeType } from "src/types/post-engagement.type";


export const LikeModelSchema = new Schema<LikeType & Document>({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'posts', required: true, index: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

LikeModelSchema.index({ userId: 1, postId: 1 }, { unique: true });
LikeModelSchema.index({ postId: 1, createdAt: -1 });

export const DislikeModelSchema = new Schema<LikeType & Document>({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'posts', required: true, index: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

DislikeModelSchema.index({ userId: 1, postId: 1 }, { unique: true });
DislikeModelSchema.index({ postId: 1, createdAt: -1 });

export const LikeModel = mongoose.model<LikeType & Document>('likes', LikeModelSchema);
export const DislikeModel = mongoose.model<LikeType & Document>('dislikes', DislikeModelSchema);
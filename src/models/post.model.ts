// models/post.model.ts
import mongoose, { Schema } from 'mongoose';
import { PostTagsEnum, PostTypeEnum } from 'src/enums/post.enum';
import { PostType } from 'src/types/post.type';


const PostModelSchema = new Schema<PostType & Document>({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    media: {
        type: {
            type: String,
            enum: Object.values(PostTypeEnum),
            default: 'quote',
        },
        urls: [{ type: String }],
        content: {
            type: String,
            required: true,
            maxlength: 500,
            trim: true
        },
        authorName: { type: String, default: 'Unknown' },
        videoUrl: { type: String, default: '' }
    },
    tags: [{ type: String, enum: Object.values(PostTagsEnum), lowercase: true }],
    engagement: {
        likes: { type: Number, default: 0, min: 0 },
        dislikes: { type: Number, default: 0, min: 0 },
        pins: { type: Number, default: 0, min: 0 },
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
PostModelSchema.index({ author: 1, createdAt: -1 });
PostModelSchema.index({ tags: 1, createdAt: -1 });

// Virtual for populated author
PostModelSchema.virtual('authorDetails', {
    ref: 'users',
    localField: 'author',
    foreignField: '_id',
    justOne: true,
    options: { select: 'email username name profilePhoto coverPhoto bio status lastActive verified followerCount followingCount friendCount accountType' }
});


export const PostModel = mongoose.model<PostType & Document>('posts', PostModelSchema);

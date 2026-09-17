import mongoose, { Document, Schema } from 'mongoose';
import { SystemType } from 'src/enums/social.enum';
import { IChatMessageDoc, IReaction } from 'src/types/message.type';


export interface IMessageDocument extends Omit<IChatMessageDoc, '_id'>, Document { }

const ReactionSchema = new Schema<IReaction>(
    {
        emoji: { type: String, required: true },
        userIds: [{ type: String, required: true }],
    },
    { _id: false }
);

const MessageSchema = new Schema<IMessageDocument>(
    {
        roomId: { type: String, required: true, index: true },
        authorId: { type: String, index: true },
        authorName: { type: String },
        recipientId: { type: String, required: true, index: true },
        text: { type: String, required: true, trim: true },
        isSystem: { type: Boolean, default: false },
        systemType: {
            type: String,
            enum: Object.values(SystemType),
            default: undefined,
        },
        replyToId: { type: String, default: null },
        editedAt: { type: Number, default: null },
        reactions: { type: [ReactionSchema], default: [] },
        createdAt: {
            type: Date,
            default: Date.now,
            // Automatic removal after 7 days (7 * 24 * 60 * 60 seconds)
            expires: 604800,
            index: true,
        },
    },
    { timestamps: true }
);

MessageSchema.index({ roomId: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessageDocument>('messages', MessageSchema);
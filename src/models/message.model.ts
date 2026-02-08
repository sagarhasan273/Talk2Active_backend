import mongoose, { Document, Model, Schema } from 'mongoose';

export interface UserMessage extends Document {
    // Core message fields
    text: string;
    time: Date;
    isUnread: boolean;

    // Message type
    type: 'message';

    // User information
    senderInfo: {
        userId: string;
        name: string;
        avatar?: string;
    } | mongoose.mongo.ObjectId;

    targetUserInfo: {
        userId: string;
        name: string;
        avatar?: string;
    } | mongoose.Types.ObjectId;

    // Thread/conversation context
    conversationId: string;

    // Reply/thread feature
    parentMessageId?: mongoose.Types.ObjectId; // Reference to parent message
    isReply: boolean;

    // Message state
    isEdited?: boolean;
    isDeleted?: boolean;
    deletedAt?: Date;

    // Reactions
    reactions?: Array<{
        userId: string;
        emoji: string;
        createdAt: Date;
    }>;

    // Timestamps (automatically added by mongoose)
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema<UserMessage> = new Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true,
        },

        time: {
            type: Date,
            required: true,
            default: () => new Date(),
        },

        isUnread: {
            type: Boolean,
            default: true,
        },

        type: {
            type: String,
            enum: ['message'],
            default: 'message',
        },

        senderInfo: {
            type: Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },

        targetUserInfo: {
            type: Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },

        // Conversation between two users
        conversationId: {
            type: String,
            required: true,
            index: true, // Index for faster queries
        },

        isEdited: {
            type: Boolean,
            default: false,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        deletedAt: Date,

        reactions: [{
            userId: String,
            emoji: String,
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],

        parentMessageId: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },

        isReply: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Compound index for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Virtual for formatted time (optional)
MessageSchema.virtual('formattedTime').get(function () {
    return this.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

export const MessageModel: Model<UserMessage> = mongoose.model<UserMessage>('message', MessageSchema);


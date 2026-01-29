import mongoose, { Document, Model, Schema } from 'mongoose';

export interface UserMessage extends Document {
    // Core message fields
    text: string;
    sender: 'me' | 'them';
    time: Date;
    isUnread: boolean;
    startOfUnread?: boolean;
    isPrivate: boolean;

    // User identifiers
    senderSocketId?: string;
    targetSocketId?: string;

    // Message type
    type: 'message';

    // User information
    senderInfo: {
        userId: string;
        name: string;
        avatar?: string;
    };

    targetUserInfo: {
        userId: string;
        name: string;
        avatar?: string;
    };

    // Thread/conversation context
    conversationId: string;

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

    // Reply/thread feature
    parentMessageId?: mongoose.Types.ObjectId; // Reference to parent message
    isReply: boolean;

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

        sender: {
            type: String,
            enum: ['me', 'them'],
            required: true,
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

        startOfUnread: {
            type: Boolean,
            default: false,
        },

        isPrivate: {
            type: Boolean,
            default: false,
        },

        senderSocketId: String,
        targetSocketId: String,

        type: {
            type: String,
            enum: ['message'],
            default: 'message',
        },

        senderInfo: {
            userId: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            avatar: String,
        },

        targetUserInfo: {
            socketId: String,
            userId: String,
            name: String,
            avatar: String,
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


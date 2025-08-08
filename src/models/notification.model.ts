// models/notification.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
    LIKE = 'like',
    COMMENT = 'comment',
    FOLLOW = 'follow',
    MENTION = 'mention',
    MESSAGE = 'message',
    SYSTEM = 'system'
}

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId; // Optional for system notifications
    type: NotificationType;
    read: boolean;
    relatedEntity?: {
        type: 'post' | 'comment' | 'message';
        id: mongoose.Types.ObjectId;
    };
    content: string;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    relatedEntity: {
        type: {
            type: String,
            enum: ['post', 'comment', 'message'],
            required: function () {
                return ['like', 'comment', 'mention'].includes(this.type);
            }
        },
        id: {
            type: Schema.Types.ObjectId,
            required: function () {
                return ['like', 'comment', 'mention'].includes(this.type);
            }
        }
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster queries
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ 'relatedEntity.id': 1 });

export const NotificationModel = mongoose.model<INotification>(
    'Notification',
    NotificationSchema
);
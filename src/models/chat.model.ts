// models/Relationship.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { LanguageLevelEnum } from 'src/enums/chat.enum';
import { RoomBase } from 'src/types/chat.type';


const RoomSchema: Schema = new Schema<RoomBase & Document>({
    room_key: {
        type: String,
        required: true,
        unique: true,
        immutable: true,
        match: [
            /^RM[A-F0-9]{10}$/,
            'User ID must follow the format RMXXXXXXXXXX',
        ],
    },
    topic: {
        type: String,
        required: true
    },
    welcome_message: {
        type: String,
    },
    languages: [{
        type: String,
        required: true
    }],
    level: {
        type: String,
        enum: Object.values(LanguageLevelEnum),
        required: true
    },
    max_participants: {
        type: Number,
        default: 10
    },
    host: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    participants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isHost: {
            type: Boolean,
            default: false,
        },
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    kickedUserIds: [
        {
            type: Schema.Types.ObjectId,
            ref: 'users'
        }
    ]
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.roomId = ret._id.toString();
            if ('_id' in ret) delete ret._id;
            if ('__v' in ret) delete ret.__v;
        }
    },
    toObject: {
        transform: function (doc, ret: any) {
            ret.roomId = ret._id.toString();
            if ('_id' in ret) delete ret._id;
            if ('__v' in ret) delete ret.__v;
        }
    },
});

// Compound indexes for performance
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ updatedAt: -1 });

// Pre-save middleware to update updatedAt
RoomSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const RoomModel = mongoose.model<RoomBase>('rooms', RoomSchema);
// models/Relationship.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { LanguageLevelEnum, ModerationModeEnum } from 'src/enums/chat.enum';
import { RoomBase } from 'src/types/chat.type';


const RoomSchema: Schema = new Schema<RoomBase & Document>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    level: {
        type: String,
        enum: Object.values(LanguageLevelEnum),
        required: true
    },
    maxParticipants: {
        type: Number,
        default: 10
    },
    public: {
        type: Boolean,
        default: true
    },
    pushToTalk: {
        type: Boolean,
        default: false
    },
    noiseSuppression: {
        type: Boolean,
        default: true
    },
    echoCancellation: {
        type: Boolean,
        default: true
    },
    autoGainControl: {
        type: Boolean,
        default: true
    },
    maxSimutaneousSpeakers: {
        type: Number,
        default: 10
    },
    moderationMode: {
        type: String,
        enum: Object.values(ModerationModeEnum),
        default: 'open'
    },
    host: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    currentParticipants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    roomType: {
        type: String,
        enum: ['conversation', 'pronunciation', 'grammar'],
        default: 'conversation'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret: any) {
            ret.id = ret._id.toString();
            if ('_id' in ret) delete ret._id;
            if ('__v' in ret) delete ret.__v;
        }
    },
    toObject: {
        transform: function (doc, ret: any) {
            ret.id = ret._id.toString();
            if ('_id' in ret) delete ret._id;
            if ('__v' in ret) delete ret.__v;
        }
    }
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
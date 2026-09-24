// models/Relationship.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { RelationshipStatusEnum, RelationshipTypeEnum } from 'src/enums/social.enum';
import { RelationshipBase } from 'src/types/social.type';


const RelationshipSchema: Schema = new Schema<RelationshipBase & Document>({
    requester: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(RelationshipTypeEnum),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(RelationshipStatusEnum),
        default: RelationshipStatusEnum.ACCEPTED
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
});

// Compound indexes for performance
RelationshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
RelationshipSchema.index({ requester: 1, type: 1, status: 1 });
RelationshipSchema.index({ recipient: 1, type: 1, status: 1 });
RelationshipSchema.index({ createdAt: -1 });

// Pre-save middleware to update updatedAt
RelationshipSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const RelationshipModel = mongoose.model<RelationshipBase>('relationship', RelationshipSchema);
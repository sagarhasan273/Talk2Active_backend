import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    reportedUser: mongoose.Types.ObjectId;
    reason: string;
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema = new Schema<IReport>({
    reporter: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    reportedUser: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'REVIEWED', 'RESOLVED'],
        default: 'PENDING'
    }
}, { timestamps: true });

export const ReportModel = mongoose.model<IReport>('report', ReportSchema);
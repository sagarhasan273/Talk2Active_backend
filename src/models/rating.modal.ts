import { model, Schema } from 'mongoose';
import { RatingBase } from 'src/types/rating.type';


const RatingSchema = new Schema<RatingBase>(
    {
        raterId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
        targetUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        levelFeedback: { type: String, trim: true },
    },
    { timestamps: true }
);

// Enforce 1 rating per rater per target user
RatingSchema.index({ raterId: 1, targetUserId: 1 }, { unique: true });

export const RatingModel = model<RatingBase>('rating', RatingSchema);
import { Types } from 'mongoose';
import { RatingModel } from 'src/models/rating.modal';
import { IRatingAggregateResult, RatingBase } from 'src/types/rating.type';


export class RatingRepository {
    public static async findRating(raterId: string, targetUserId: string): Promise<RatingBase | null> {
        return RatingModel.findOne({
            raterId: new Types.ObjectId(raterId),
            targetUserId: new Types.ObjectId(targetUserId),
        });
    }

    public static async upsertRating(
        raterId: string,
        targetUserId: string,
        rating: number,
        levelFeedback: string
    ): Promise<{ doc: RatingBase; isNew: boolean }> {
        const raterObjId = new Types.ObjectId(raterId);
        const targetObjId = new Types.ObjectId(targetUserId);

        const existing = await RatingModel.findOne({ raterId: raterObjId, targetUserId: targetObjId });

        if (existing) {
            existing.rating = rating;
            existing.levelFeedback = levelFeedback as any;
            await existing.save();
            return { doc: existing, isNew: false };
        }

        const created = await RatingModel.create({
            raterId: raterObjId,
            targetUserId: targetObjId,
            rating,
            levelFeedback,
        });

        return { doc: created, isNew: true };
    }

    public static async calculateUserAggregate(targetUserId: string): Promise<IRatingAggregateResult | null> {
        const targetObjId = new Types.ObjectId(targetUserId);
        const stats = await RatingModel.aggregate<IRatingAggregateResult>([
            { $match: { targetUserId: targetObjId } },
            {
                $group: {
                    _id: '$targetUserId',
                    count: { $sum: 1 },
                    totalScore: { $sum: '$rating' },
                    avgRating: { $avg: '$rating' },
                },
            },
        ]);

        return stats[0] || null;
    }
}
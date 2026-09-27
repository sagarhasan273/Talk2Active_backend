import { Types } from 'mongoose';
import { UserModel } from 'src/models/user.model';
import { RatingRepository } from 'src/repositories/rating.repository';
import { ISubmitRatingDto, IUserRatingStats } from 'src/types/rating.type';

export class RatingService {
  public static async submitRating(
    raterId: string,
    dto: ISubmitRatingDto
  ): Promise<{ isNew: boolean; rating: number; stats: IUserRatingStats }> {
    if (raterId === String(dto.targetUserId)) {
      const error: any = new Error('You cannot rate yourself');
      error.statusCode = 400;
      throw error;
    }

    // 1. Upsert the rating
    const { doc, isNew } = await RatingRepository.upsertRating(
      raterId,
      String(dto.targetUserId),
      dto.rating,
      dto.levelFeedback
    );

    // 2. Recalculate aggregation
    const aggregate = await RatingRepository.calculateUserAggregate(String(dto.targetUserId));

    const count = aggregate?.count ?? 0;
    const totalScore = aggregate?.totalScore ?? 0;
    const average = aggregate ? Math.round(aggregate.avgRating * 10) / 10 : 0;

    // 3. Update target user document directly
    await UserModel.findByIdAndUpdate(new Types.ObjectId(dto.targetUserId), {
      $set: {
        'ratings.count': count,
        'ratings.totalScore': totalScore,
        'ratings.average': average,
      },
    });

    return {
      isNew,
      rating: doc.rating,
      stats: {
        userId: dto.targetUserId,
        count,
        totalScore,
        average,
      },
    };
  }

  public static async getUserRatingStats(targetUserId: string): Promise<IUserRatingStats> {
    const aggregate = await RatingRepository.calculateUserAggregate(targetUserId);

    return {
      userId: new Types.ObjectId(targetUserId),
      count: aggregate?.count ?? 0,
      totalScore: aggregate?.totalScore ?? 0,
      average: aggregate ? Math.round(aggregate.avgRating * 10) / 10 : 0,
    };
  }
}
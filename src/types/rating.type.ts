import {
    RatingResponseSchema,
    RatingBaseSchema,
    SubmitRatingSchema,
    UserRatingStatsSchema,
} from 'src/schemas/rating.schema';
import { z } from 'zod';

export type RatingBase = z.infer<typeof RatingBaseSchema>;
export type ISubmitRatingDto = z.infer<typeof SubmitRatingSchema>;
export type IUserRatingStats = z.infer<typeof UserRatingStatsSchema>;
export type IRatingResponse = z.infer<typeof RatingResponseSchema>;

export interface IRatingAggregateResult {
    _id: any;
    count: number;
    totalScore: number;
    avgRating: number;
}
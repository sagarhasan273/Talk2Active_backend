import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { DatePreprocessor } from './user.schema';

// ----------------------------------------------------------------------
// Proficiency Enum & Constants
// ----------------------------------------------------------------------

export const SpeakingProficiencyLevelEnum = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    FLUENT: 'fluent',
    NATIVE: 'native',
} as const;

export type SpeakingProficiencyLevelType =
    (typeof SpeakingProficiencyLevelEnum)[keyof typeof SpeakingProficiencyLevelEnum];

// ----------------------------------------------------------------------
// Base Rating Schema
// ----------------------------------------------------------------------

export const RatingBaseSchema = z.object({
    _id: objectIdSchema.optional(),
    raterId: objectIdSchema,
    targetUserId: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    levelFeedback: z.nativeEnum(SpeakingProficiencyLevelEnum).default(SpeakingProficiencyLevelEnum.INTERMEDIATE),
    createdAt: DatePreprocessor.default(() => new Date()),
    updatedAt: DatePreprocessor.default(() => new Date()),
});

// ----------------------------------------------------------------------
// Request / Action Schemas
// ----------------------------------------------------------------------

export const SubmitRatingSchema = z.object({
    targetUserId: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    levelFeedback: z.nativeEnum(SpeakingProficiencyLevelEnum).default(SpeakingProficiencyLevelEnum.INTERMEDIATE),
});

// ----------------------------------------------------------------------
// Aggregate & Response Schemas
// ----------------------------------------------------------------------

export const UserRatingStatsSchema = z.object({
    userId: objectIdSchema,
    average: z.number().nonnegative().default(0),
    count: z.number().int().nonnegative().default(0),
    totalScore: z.number().int().nonnegative().default(0),
});

export const RatingResponseSchema = RatingBaseSchema.extend({
    id: z.string().optional(),
});
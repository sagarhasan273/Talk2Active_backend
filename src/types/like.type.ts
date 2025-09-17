import { CreateLikeSchema, DeleteLikeSchema, LikeCountSchema, LikeSchema, UserLikesSchema } from 'src/schemas/like.schema';
import { z } from 'zod';

// Type definitions
export type LikeType = z.infer<typeof LikeSchema>;
export type CreateLikeInput = z.infer<typeof CreateLikeSchema>;
export type DeleteLikeInput = z.infer<typeof DeleteLikeSchema>;
export type LikeCountType = z.infer<typeof LikeCountSchema>;
export type UserLikesType = z.infer<typeof UserLikesSchema>;

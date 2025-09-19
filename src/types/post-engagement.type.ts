import { CreateLikeSchema, DeleteLikeSchema, LikeCountSchema, LikedPostsResponseSchema, LikedPostsSchema, LikeSchema, UserLikesSchema } from 'src/schemas/post-engagement.schema';
import { z } from 'zod';

// Type definitions
export type LikeType = z.infer<typeof LikeSchema>;
export type CreateLikeInput = z.infer<typeof CreateLikeSchema>;
export type LikedPostsInput = z.infer<typeof LikedPostsSchema>;
export type LikedPostsResponseType = z.infer<typeof LikedPostsResponseSchema>;
export type DeleteLikeInput = z.infer<typeof DeleteLikeSchema>;
export type LikeCountType = z.infer<typeof LikeCountSchema>;
export type UserLikesType = z.infer<typeof UserLikesSchema>;

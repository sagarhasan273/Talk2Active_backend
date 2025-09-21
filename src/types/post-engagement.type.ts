import { CreateDisLikeSchema, CreateLikeSchema, DeleteDisLikeSchema, DeleteLikeSchema, DisLikeCountSchema, DisLikedPostsResponseSchema, DisLikedPostsSchema, LikeCountSchema, LikedPostsResponseSchema, LikedPostsSchema, LikeSchema, UserDisLikesSchema, UserLikesSchema } from 'src/schemas/post-engagement.schema';
import { z } from 'zod';

// Type definitions for Likes
export type LikeType = z.infer<typeof LikeSchema>;
export type CreateLikeInput = z.infer<typeof CreateLikeSchema>;
export type LikedPostsInput = z.infer<typeof LikedPostsSchema>;
export type LikedPostsResponseType = z.infer<typeof LikedPostsResponseSchema>;
export type DeleteLikeInput = z.infer<typeof DeleteLikeSchema>;
export type LikeCountType = z.infer<typeof LikeCountSchema>;
export type UserLikesType = z.infer<typeof UserLikesSchema>;

// Type definitions for Dislikes
export type DislikeType = z.infer<typeof LikeSchema>;
export type CreateDislikeInput = z.infer<typeof CreateDisLikeSchema>;
export type DislikedPostsInput = z.infer<typeof DisLikedPostsSchema>;
export type DislikedPostsResponseType = z.infer<typeof DisLikedPostsResponseSchema>;
export type DeleteDislikeInput = z.infer<typeof DeleteDisLikeSchema>;
export type DislikeCountType = z.infer<typeof DisLikeCountSchema>;
export type UserDislikesType = z.infer<typeof UserDisLikesSchema>;

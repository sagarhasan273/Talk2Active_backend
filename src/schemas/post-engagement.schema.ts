import { z } from "zod";
import { objectIdSchema } from "./base.schema";

export const LikeSchema = z.object({
    userId: objectIdSchema,
    postId: objectIdSchema,
    createdAt: z.date().default(() => new Date()),
});

export const CreateLikeSchema = LikeSchema.omit({
    createdAt: true
});

export const DeleteLikeSchema = z.object({
    userId: objectIdSchema,
    postId: objectIdSchema,
});

export const LikedPostsSchema = z.object({
    postIds: z.array(objectIdSchema).default([]),
    userId: objectIdSchema,
});

export const LikedPostsResponseSchema = LikeSchema.omit({
    createdAt: true
});

export const LikeCountSchema = z.object({
    postId: objectIdSchema,
    likeCount: z.number().int().nonnegative().default(0),
});

export const UserLikesSchema = z.object({
    userId: objectIdSchema,
    likes: z.array(LikeSchema).default([]),
    total: z.number().int().nonnegative().default(0),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative().default(0),
});

/// Dislike Schemas ///

export const DisLikeSchema = z.object({
    userId: objectIdSchema,
    postId: objectIdSchema,
    createdAt: z.date().default(() => new Date()),
});

export const CreateDisLikeSchema = DisLikeSchema.omit({
    createdAt: true
});

export const DeleteDisLikeSchema = z.object({
    userId: objectIdSchema,
    postId: objectIdSchema,
});

export const DisLikedPostsSchema = z.object({
    postIds: z.array(objectIdSchema).default([]),
    userId: objectIdSchema,
});

export const DisLikedPostsResponseSchema = DisLikeSchema.omit({
    createdAt: true
});

export const DisLikeCountSchema = z.object({
    postId: objectIdSchema,
    likeCount: z.number().int().nonnegative().default(0),
});

export const UserDisLikesSchema = z.object({
    userId: objectIdSchema,
    likes: z.array(DisLikeSchema).default([]),
    total: z.number().int().nonnegative().default(0),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative().default(0),
});
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
})
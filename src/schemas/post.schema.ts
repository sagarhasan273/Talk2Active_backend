import { PostTagsEnum } from "src/enums/post.enum";
import { z } from "zod";
import { objectIdSchema } from "./base.schema";

// Media Schema
export const MediaSchema = z.object({
    type: z.enum(['image', 'video', 'gif', 'none']).default('none'),
    urls: z.array(z.string().url()).default([]).optional(),
    content: z.string()
        .min(1, "Content cannot be empty")
        .max(500, "Content cannot exceed 500 characters")
        .trim().optional(),
});

// Engagement Schema
export const EngagementSchema = z.object({
    likes: z.number().int().nonnegative().default(0),
    dislikes: z.number().int().nonnegative().default(0),
    pins: z.number().int().nonnegative().default(0),
});

// Main Post Schema
export const PostSchema = z.object({
    author: objectIdSchema,
    media: MediaSchema.default({ type: 'none', urls: [], content: '' }),
    tags: z.array(z.enum(Object.values(PostTagsEnum) as [string, ...string[]]))
        .max(30, "Cannot have more than 30 tags")
        .default([]),
    engagement: EngagementSchema.default({ likes: 0, dislikes: 0, pins: 0 }),
    isDeleted: z.boolean().default(false),
    deletedAt: z.date().optional(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});

// Schema for creating a new post (excludes auto-generated fields)
export const CreatePostSchema = PostSchema.omit({
    engagement: true,
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
});

// Schema for updating a post
export const UpdatePostSchema = PostSchema.partial().extend(
    {
        postId: objectIdSchema
    }
);

export const GetPostsSchemaInput = z.object({
    userId: objectIdSchema
});

// Schema for API response (transformed data)
export const PostResponseSchema = PostSchema.omit({
    author: true,
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
}).extend({
    id: z.string(),
    authorDetails: z.object({
        _id: z.string(),
        username: z.string(),
        name: z.string().optional(),
        profilePhoto: z.string().url().optional(),
        verified: z.boolean().default(false)
    }).optional(),
    // Add like status for the current user
    isLiked: z.boolean().optional(),
});
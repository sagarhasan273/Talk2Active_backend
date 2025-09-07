import { PostTagsEnum } from "src/types/post.type";
import { z } from "zod";
import { objectIdSchema } from "./user.schema";

// Media Schema
export const MediaSchema = z.object({
    type: z.enum(['image', 'video', 'gif', 'none']).default('none'),
    urls: z.array(z.string().url()).default([]),
    content: z.string()
        .min(1, "Content cannot be empty")
        .max(2000, "Content cannot exceed 2000 characters")
        .trim(),
});

// Engagement Schema
export const EngagementSchema = z.object({
    likes: z.number().int().nonnegative().default(0),
    repost: z.number().int().nonnegative().default(0),
});

// Main Post Schema
export const PostSchema = z.object({
    author: objectIdSchema,
    media: MediaSchema.default({ type: 'none', urls: [], content: '' }),
    tags: z.array(z.enum(Object.values(PostTagsEnum) as [string, ...string[]]))
        .max(30, "Cannot have more than 30 tags")
        .default([]),
    isDeleted: z.boolean().default(false),
    deletedAt: z.date().optional(),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date())
});

// Schema for creating a new post (excludes auto-generated fields)
export const CreatePostSchema = PostSchema.omit({
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
}).extend({
    // Make author optional for creation (can be set from authenticated user)
    author: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: "Invalid author ObjectId format"
    }).optional()
});

// Schema for updating a post
export const UpdatePostSchema = CreatePostSchema.partial();

// Schema for API response (transformed data)
export const PostResponseSchema = PostSchema.extend({
    id: z.string(),
    authorDetails: z.object({
        _id: z.string(),
        username: z.string(),
        name: z.string().optional(),
        profilePhoto: z.string().url().optional(),
        verified: z.boolean().default(false)
    }).optional()
});
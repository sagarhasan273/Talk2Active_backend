import { PostTagsEnum, PostTypeEnum } from "src/enums/post.enum";
import { z } from "zod";
import { objectIdSchema } from "./base.schema";

// Media Schema
export const MediaSchema = z.object({
    type: z.nativeEnum(PostTypeEnum).default('quote'),
    urls: z.array(z.string().url()).default([]).optional(),
    content: z.string()
        .min(1, "Content cannot be empty")
        .max(500, "Content cannot exceed 500 characters")
        .trim().optional(),
    authorName: z.string().optional(),
    videoUrl: z.string().url().default('').optional(),
});

// Engagement Schema
export const EngagementSchema = z.object({
    likes: z.number().int().nonnegative().default(0),
    dislikes: z.number().int().nonnegative().default(0),
    pins: z.number().int().nonnegative().default(0),
});

// Main Post Schema
export const PostSchema = z.object({
    postId: objectIdSchema,
    author: objectIdSchema,
    media: MediaSchema.default({ type: 'quote', urls: [], content: '' }),
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
    postId: true,
    engagement: true,
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
});

// Schema for updating a post
export const UpdatePostSchema = PostSchema.omit({
    engagement: true,
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
}).extend(
    {
        postId: objectIdSchema
    }
);

export const DeletePostSchema = z.object({
    postId: objectIdSchema,
    author: objectIdSchema
})

export const GetPostsSchemaInput = z.object({
    userId: objectIdSchema
});
export const GetPostsByUserIdSchemaInput = z.object({
    userId: objectIdSchema,
    type: z.enum(['posts', 'likes', 'dislikes', 'pins'])
});

// Schema for API response (transformed data)
export const PostResponseSchema = PostSchema.omit({
    isDeleted: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true
}).extend({
    authorDetails: z.object({
        _id: objectIdSchema,
        username: z.string(),
        name: z.string(),
        profilePhoto: z.string().url(),
        verified: z.boolean().default(false)
    }),
    authorRelationship: z.object({
        relationship: z.enum(['following', 'followers', 'friends', 'blocked', 'pending', 'none']),
        following: z.boolean(),
        followers: z.boolean(),
        friends: z.boolean(),
        blocked: z.boolean(),
        pending: z.boolean(),
    })
});
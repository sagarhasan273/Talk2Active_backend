import { CreatePostSchema, MediaSchema, PostResponseSchema, PostSchema, UpdatePostSchema } from "src/schemas/post.schema";
import { z } from 'zod';

// Enum for Post Tags
export const PostTagsEnum = Object.freeze({
    QUOTES: 'quotes',
    MOTIVATION: 'motivation',
    WISDOM: 'wisdom',
    LOVE_AND_LIFE: 'love & life',
    SUCCESS: 'success',
    BUSINESS: 'business',
    CREATIVITY: 'creativity',
    TECHNOLOGY: 'technology',
    HEALTH_AND_FITNESS: 'health & fitness',
    TRAVEL: 'travel',
    MUSIC_AND_ARTS: 'music & arts',
    PHOTOGRAPHY: 'photography',
    GAMING: 'gaming',
    BOOKS_AND_LEARNING: 'books & learning',
    LIFESTYLE: 'lifestyle'
});

// Type definitions
export type PostType = z.infer<typeof PostSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type Media = z.infer<typeof MediaSchema>;

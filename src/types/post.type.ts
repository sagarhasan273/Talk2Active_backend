import { CreatePostSchema, MediaSchema, PostResponseSchema, PostSchema, UpdatePostSchema } from "src/schemas/post.schema";
import { z } from 'zod';

// Type definitions
export type PostType = z.infer<typeof PostSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type Media = z.infer<typeof MediaSchema>;

import { CreatePostSchema, DeletePostSchema, GetPostsByUserIdSchemaInput, GetPostsSchemaInput, MediaSchema, PostResponseSchema, PostSchema, UpdatePostSchema } from "src/schemas/post.schema";
import { z } from 'zod';

// Type definitions
export type PostType = z.infer<typeof PostSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type DeletePostInput = z.infer<typeof DeletePostSchema>;
export type GetPostsInput = z.infer<typeof GetPostsSchemaInput>;
export type GetPostsByUserIdInput = z.infer<typeof GetPostsByUserIdSchemaInput>
export type PostResponseType = z.infer<typeof PostResponseSchema>;
export type Media = z.infer<typeof MediaSchema>;

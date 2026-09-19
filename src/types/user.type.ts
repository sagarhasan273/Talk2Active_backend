import { CreateUserSchema, LogInUserSchema, ParticipantResponseSchema, SocialLinksSchema, UpdateUserSchema, UserBaseSchema, UserResponseSchema } from 'src/schemas/user.schema';
import { z as zod } from 'zod';

// Type Definitions
export type UserBaseType = zod.infer<typeof UserBaseSchema>;
export type UserResponseType = zod.infer<typeof UserResponseSchema>;
export type CreateUserInput = zod.infer<typeof CreateUserSchema>;
export type UpdateUserInput = zod.infer<typeof UpdateUserSchema>;
export type LogInUserInput = zod.infer<typeof LogInUserSchema>;
export type ParticipantResponseType = zod.infer<typeof ParticipantResponseSchema>;
export type SocialLinks = zod.infer<typeof SocialLinksSchema>;
export type UserAccessToken = { token: string };

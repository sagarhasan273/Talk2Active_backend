import { CreateUserSchema, LogInUserSchema, SocialLinksSchema, UpdateUserSchema, UserBaseSchema, UserResponseSchema, VoiceParticipantSchema } from 'src/schemas/user.schema';
import { z as zod } from 'zod';

// Type Definitions
export type UserBaseType = zod.infer<typeof UserBaseSchema>;
export type UserType = zod.infer<typeof UserResponseSchema>;
export type CreateUserInput = zod.infer<typeof CreateUserSchema>;
export type UpdateUserInput = zod.infer<typeof UpdateUserSchema>;
export type LogInUserInput = zod.infer<typeof LogInUserSchema>;
export type VoiceParticipantType = zod.infer<typeof VoiceParticipantSchema>;
export type SocialLinks = zod.infer<typeof SocialLinksSchema>;
export type UserAccessToken = { token: string };

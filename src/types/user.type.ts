import { CreateUserSchema, LogInUserSchema, ParticipantUserSchema, SocialLinksSchema, UpdateUserRecentRoomsSchema, UpdateUserSchema, UserAccountActivateSchema, UserAccountSessionSchema, UserAccountUpdateSchema, UserSchema } from 'src/schemas/user.schema';
import { z as zod } from 'zod';

// Type Definitions
export type UserType = zod.infer<typeof UserSchema>;
export type CreateUserInput = zod.infer<typeof CreateUserSchema>;
export type UpdateUserInput = zod.infer<typeof UpdateUserSchema>;
export type UpdateUserRecentRoomsInput = zod.infer<typeof UpdateUserRecentRoomsSchema>;
export type LogInUserInput = zod.infer<typeof LogInUserSchema>;
export type UserAccountUpdateInput = zod.infer<typeof UserAccountUpdateSchema>;
export type UserAccountActivateInput = zod.infer<typeof UserAccountActivateSchema>;
export type UserAccountSessionInput = zod.infer<typeof UserAccountSessionSchema>;
export type ParticipantUserType = zod.infer<typeof ParticipantUserSchema>;
export type SocialLinks = zod.infer<typeof SocialLinksSchema>;
export type UserWithoutPassword = Omit<UserType, 'password' | '__v'>;
export type UserAccessToken = { token: string };

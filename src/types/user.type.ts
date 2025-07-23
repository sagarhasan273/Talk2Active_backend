import { CreateUserSchema, SocialLinksSchema, UpdateUserSchema, UserSchema } from 'src/schemas/user.shema';
import { z as zod } from 'zod';

// Type Definitions
export type UserType = zod.infer<typeof UserSchema>;
export type CreateUserInput = zod.infer<typeof CreateUserSchema>;
export type UpdateUserInput = zod.infer<typeof UpdateUserSchema>;
export type LogInUserInput = Pick<UserType, 'email' | 'password'>;
export type SocialLinks = zod.infer<typeof SocialLinksSchema>;
export type UserWithoutPassword = Omit<UserType, 'password' | '__v'>;
export type UserWithToken = { user: UserWithoutPassword, token: string };
import { CreateUserSchema, UserSchema } from 'src/models/user.model';
import { z as zod } from 'zod';

export type User = zod.infer<typeof UserSchema>;
export type CreateUserType = zod.infer<typeof CreateUserSchema>;
export type UserWithoutPassword = Omit<User, 'password'>;
export type UserWithToken = {
  user: UserWithoutPassword;
  token: string;
};

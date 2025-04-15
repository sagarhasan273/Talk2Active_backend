import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  profileStatus?: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;

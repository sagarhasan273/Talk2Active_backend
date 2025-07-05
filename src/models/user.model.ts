import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  name: string;
  username: string;
  email: string;
  profilePhoto: string;
  coverPhoto: string;
  bio: string;
  dateOfBirth?: Date;
  gender?: string;
  joinDate: Date;
  lastActive: Date;
  status: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  postCount: number;
  location?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWithoutPassword = Omit<User, 'password'>;

export type UserWithToken = {
  user: UserWithoutPassword;
  token: string;
};

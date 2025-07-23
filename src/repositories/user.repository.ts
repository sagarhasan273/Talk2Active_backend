import { ObjectId } from 'mongodb';
import { CreateUserInput, LogInUserInput, UserType, UserWithoutPassword, UserWithToken } from 'src/types/user.type';

import mongoose from 'mongoose';
import { connectToDatabase } from 'src/database';
import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';
import { PasswordService } from 'src/services/auth/password.service';
import { ReturnResponseType } from 'src/types/base.type';
import { generateUserId } from 'src/utils/generate.userId';

export class UserRepository {

  public async getUserById(id: string): Promise<UserWithoutPassword> {
    if (!id) throw new Error('User ID is required');

    const user = await UserModel.findOne({ _id: new ObjectId(id) });

    if (!user) throw new Error('User not found');

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Create a new user
   */
  public async createUser(input: CreateUserInput): Promise<UserType> {
    await connectToDatabase();
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      const existingUser = await UserModel.findOne({
        $or: [
          { email: input.email },
          { username: input.username }
        ]
      });


      if (existingUser) {
        throw new Error('User already exists with that email or username');
      }

      // Create the new user
      // Hash password
      const hashedPassword = await PasswordService.hashPassword(input.password);

      const userId = generateUserId();
      // Create user
      const user = await UserModel.create({
        ...input,
        userId: userId,
        password: hashedPassword,
        lastActive: new Date()
      });

      return user.toJSON();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }


  }

  public async updateUser(input: UserType): Promise<ReturnResponseType> {

    if (!input._id) throw new Error('User ID is required');
    const { _id, ...updatableFields } = input;

    await UserModel.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...updatableFields,
          updatedAt: new Date(),
        },
      }
    );
    return { message: 'Profile updated successfully', status: true };
  }

  public async updateUserAccount(input: UserType): Promise<ReturnResponseType> {


    if (!input._id) throw new Error('User ID is required');
    const { _id, ...updatableFields } = input;

    await UserModel.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...updatableFields,
          updatedAt: new Date(),
        },
      }
    );
    return { message: 'Profile updated successfully', status: true };
  }

  public async logInUser(input: LogInUserInput): Promise<UserWithToken> {
    const { email, password } = input;
    if (!email || !password) throw new Error('Email and password are required');

    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("User doesn't exist");

    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
    if (!isPasswordValid) throw new Error('Invalid email or password');

    const { password: undefined, ...userWithoutPassword } = user.toJSON();
    if (!userWithoutPassword) throw new Error('User not found');

    const token = JwtService.generateToken(user as UserType);
    if (!token) throw new Error('Failed to generate token');

    return { user: userWithoutPassword, token };
  }

  public async getUser(token: string): Promise<UserWithoutPassword> {

    const decodedToken = JwtService.decodeToken(token);
    if (!decodedToken) throw new Error('Invalid token');

    const userId = decodedToken.id;
    if (!userId) throw new Error('User ID not found in token');

    const user = await UserModel.findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error('User not found');

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }
}

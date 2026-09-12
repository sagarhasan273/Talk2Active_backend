import { ObjectId } from 'mongodb';
import {
  CreateUserInput,
  LogInUserInput,
  UpdateUserInput,
  UserBaseType,
  UserType,
} from 'src/types/user.type';

import { UserModel } from 'src/models/user.model';
import { PasswordService } from 'src/services/auth/password.service';
import { ReturnResponseType } from 'src/types/base.type';
import { AppError } from 'src/utils/errors';
import { generateUserId } from 'src/utils/generate.userId';

export class UserRepository {
  public async logInUser(input: LogInUserInput): Promise<UserBaseType> {
    try {
      const { email } = input;

      const user = await UserModel.findOne({ email });
      if (!user) throw new AppError("User doesn't exist!", 404, 'User Repository');

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to log in user!', 500, 'User Repository');
    }
  }

  /**
   * Create a new user
   */
  public async createUser(input: CreateUserInput): Promise<UserBaseType> {
    try {
      const existingUser = await UserModel.findOne({
        $or: [{ email: input.email }, { username: input.username }],
      });

      if (existingUser) {
        throw new AppError('User already exists! You can log in instead.', 409, 'User Repository');
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(input.password);

      const genUserId = generateUserId();
      if (!genUserId) {
        throw new AppError('Failed to generate user ID', 500, 'User Repository');
      }

      const now = new Date();

      // Create user
      const user = await UserModel.create({
        ...input,
        genUserId: genUserId,
        password: hashedPassword,
        lastActive: now,
      });

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create user!', 500, 'User Repository');
    }
  }

  public async getUserById(id: string): Promise<UserBaseType> {
    const user = await UserModel.findOne({ _id: new ObjectId(id) });

    if (!user) throw new AppError('User not found', 404, 'User Repository');

    return user.toJSON();
  }

  public async updateUser(input: UpdateUserInput): Promise<ReturnResponseType> {
    try {
      const { userId, ...updatableFields } = input;

      const user = await UserModel.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            ...updatableFields,
            updatedAt: new Date(),
          },
        }
      );

      if (!user.modifiedCount) {
        throw new AppError('Failed to update user', 404, 'User Repository');
      }

      return { message: 'Profile updated successfully', status: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user!', 500, 'User Repository');
    }
  }

  public async getUser(userId: string): Promise<UserType> {
    const user = await UserModel.findById(userId);

    if (!user) throw new AppError('User not found!', 404, 'User Repository');

    return user.toJSON();
  }
}

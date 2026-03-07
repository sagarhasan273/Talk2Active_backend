import { ObjectId } from 'mongodb';
import {
  CreateUserInput,
  LogInUserInput,
  UpdateUserInput,
  UpdateUserRecentRoomsInput,
  UserAccountActivateInput,
  UserAccountSessionInput,
  UserAccountUpdateInput,
  UserType,
} from 'src/types/user.type';

import { UserModel } from 'src/models/user.model';
import { PasswordService } from 'src/services/auth/password.service';
import { ReturnResponseType } from 'src/types/base.type';
import { AppError } from 'src/utils/errors';
import { generateUserId } from 'src/utils/generate.userId';

export class UserRepository {
  public async logInUser(input: LogInUserInput): Promise<UserType> {
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
  public async createUser(input: CreateUserInput): Promise<UserType> {
    try {
      const existingUser = await UserModel.findOne({
        $or: [{ email: input.email }, { username: input.username }],
      });

      if (existingUser) {
        throw new AppError('User already exists! You can log in instead.', 409, 'User Repository');
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(input.password);

      const userId = generateUserId();
      if (!userId) {
        throw new AppError('Failed to generate user ID', 500, 'User Repository');
      }

      const now = new Date();

      // Create user
      const user = await UserModel.create({
        ...input,
        userId: userId,
        password: hashedPassword,
        lastActive: now,
      });

      return user.toJSON();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create user!', 500, 'User Repository');
    }
  }

  public async getUserById(id: string): Promise<UserType> {
    const user = await UserModel.findOne({ _id: new ObjectId(id) });

    if (!user) throw new AppError('User not found', 404, 'User Repository');

    return user.toJSON();
  }

  public async updateUser(input: UpdateUserInput): Promise<ReturnResponseType> {
    try {
      const { id, ...updatableFields } = input;

      const user = await UserModel.updateOne(
        { _id: new ObjectId(id) },
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

  public async updateUserRecentRooms(
    input: UpdateUserRecentRoomsInput
  ): Promise<ReturnResponseType> {
    try {
      const { id, roomId } = input; // Assuming you pass roomId to add to recent rooms

      // First, remove any rooms older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in milliseconds

      await UserModel.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: {
            recentRooms: {
              joinedAt: { $lt: oneHourAgo.toISOString() }, // Remove if joinedAt < 1 hour ago
            },
          },
        }
      );

      // Then add the new room to recentRooms (if roomId is provided)
      if (roomId) {
        // First, remove any existing entry with same roomId to avoid duplicates
        await UserModel.updateOne(
          { _id: new ObjectId(id) },
          {
            $pull: {
              recentRooms: {
                room: new ObjectId(roomId),
              },
            },
          }
        );

        // Then add the new room entry
        await UserModel.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              recentRooms: {
                $each: [
                  {
                    room: new ObjectId(roomId),
                    joinedAt: new Date().toISOString(),
                  },
                ],
                $position: 0, // Add to beginning of array
                $slice: 10, // Keep only last 10 recent rooms (optional)
              },
            },
          }
        );
      }

      return {
        message: 'Recent rooms updated successfully',
        status: true,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update recent rooms!', 500, 'User Repository');
    }
  }

  public async getUserWithRooms(userId: string): Promise<UserType> {
    const user = await UserModel.findById(userId).populate({
      path: 'recentRooms.room',
      select: 'name description languages level maxParticipants host isActive',
      populate: {
        path: 'host',
        select: '_id name userId profilePhoto accountType',
      },
    });

    if (!user) throw new AppError('User not found!', 404, 'User Repository');

    return user.toJSON();
  }

  public async getUser(userId: string): Promise<UserType> {

    const user = await this.getUserWithRooms(userId);

    return user
  }

  public async updateUserAccount(input: UserAccountUpdateInput): Promise<ReturnResponseType> {
    if (!input.id) throw new Error('User ID is required');

    const { id, userId, password, newPassword, ...updatableFields } = input;

    const user = await UserModel.findOne({ _id: new ObjectId(id), userId }).select('+password');
    if (!user) throw new AppError('User not found', 404, 'User Repository');

    if (!password || !newPassword)
      throw new AppError('Password and new password are required', 400, 'User Repository');

    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);

    if (!isPasswordValid)
      throw new AppError('Current password is incorrect.', 401, 'User Repository');

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updatableFields,
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedUser) throw new AppError('Failed to update user account', 404, 'User Repository');

    return { message: 'Profile updated successfully', status: true };
  }

  public async updateUserAccountActivate(
    input: UserAccountActivateInput
  ): Promise<ReturnResponseType> {
    const { id, accountActive } = input;

    const user = await UserModel.findOne({ _id: new ObjectId(id) });
    if (!user) throw new Error('User not found');

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          accountActive,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedUser)
      throw new AppError('Failed to update user account activation status', 404, 'User Repository');

    return { message: 'Account activation status updated successfully', status: true };
  }

  public async updateUserAccountSession(
    input: UserAccountSessionInput
  ): Promise<ReturnResponseType> {
    const { id, sessionTimeOut } = input;

    const user = await UserModel.findOne({ _id: new ObjectId(id) });
    if (!user) throw new Error('User not found');

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          sessionTimeOut,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedUser)
      throw new AppError('Failed to update user account session', 404, 'User Repository');

    return { message: 'Account session updated successfully', status: true };
  }
}

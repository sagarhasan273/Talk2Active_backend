import { ObjectId } from 'mongodb';
import { CreateUserInput, LogInUserInput, UserAccountUpdateInput, UserType, UserWithoutPassword } from 'src/types/user.type';

import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';
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
      throw error;
    }
  }

  /**
   * Create a new user
   */
  public async createUser(input: CreateUserInput): Promise<UserType> {
    try {
      const existingUser = await UserModel.findOne({
        $or: [
          { email: input.email },
          { username: input.username }
        ]
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

      // Create user
      const user = await UserModel.create({
        ...input,
        userId: userId,
        password: hashedPassword,
        lastActive: new Date()
      });

      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }

  public async getUserById(id: string): Promise<UserWithoutPassword> {
    if (!id) throw new Error('User ID is required');

    const user = await UserModel.findOne({ _id: new ObjectId(id) });

    if (!user) throw new Error('User not found');

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }


  public async updateUser(input: UserType): Promise<ReturnResponseType> {

    if (!input.id) throw new Error('User ID is required');
    const { id, ...updatableFields } = input;

    await UserModel.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updatableFields,
          updatedAt: new Date(),
        },
      }
    );
    return { message: 'Profile updated successfully', status: true };
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

  public async updateUserAccount(input: UserAccountUpdateInput): Promise<ReturnResponseType> {
    if (!input.id) throw new Error('User ID is required');

    const { id, userId, password, newPassword, ...updatableFields } = input;


    const user = await UserModel.findOne({ _id: new ObjectId(id), userId }).select('+password');
    if (!user) throw new Error('User not found');

    if (!password || !newPassword) throw new Error('Password and new password are required');

    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);

    if (!isPasswordValid) throw new Error('Current password is incorrect.');

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

    console.log('Updated User:', updatedUser);

    if (!updatedUser) throw new Error('Failed to update user account');

    return { message: 'Profile updated successfully', status: true };
  }
}

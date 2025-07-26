

import { UserRepository } from 'src/repositories/user.repository';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateUserInput, LogInUserInput, UserAccountUpdateInput, UserType, UserWithoutPassword, UserWithToken } from 'src/types/user.type';
import { AppError, DatabaseError } from 'src/utils/errors';
import { JwtService } from './auth/jwt.service';
import { PasswordService } from './auth/password.service';

export class UserService {
  private repository = new UserRepository();

  public async logInUser(input: LogInUserInput): Promise<UserWithToken> {
    try {
      const user = await this.repository.logInUser(input);
      if (!user) {
        throw new AppError('Invalid email or password', 404);
      }
      const { password } = input;

      const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
      if (!isPasswordValid) throw new AppError('Invalid password', 401);

      const { password: undefined, ...userWithoutPassword } = user;

      const token = JwtService.generateToken(user as UserType);
      if (!token) throw new AppError('Failed to generate token.', 500);

      return { user: userWithoutPassword, token };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to log in user in service.', 500);
    }
  }

  public async createUser(input: CreateUserInput): Promise<UserType> {
    try {

      return await this.repository.createUser(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to create user');
    }
  }

  public async updateUser(input: UserType): Promise<ReturnResponseType> {
    try {
      return await this.repository.updateUser(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to create user');
    }
  }

  public async getUserById(id: string): Promise<UserWithoutPassword> {
    try {
      return await this.repository.getUserById(id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, "User doesn't exist");
      }
      throw new DatabaseError(error as Error, 'Failed to get user by email');
    }
  }


  public async getUser(token: string): Promise<UserWithoutPassword> {
    try {
      return await this.repository.getUser(token);
    } catch (error) {
      throw new DatabaseError(error as Error, 'Failed to get user by ID');
    }
  }

  public async updateUserAccount(input: UserAccountUpdateInput): Promise<ReturnResponseType> {
    try {
      return await this.repository.updateUserAccount(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to update user account');
    }
  }
}

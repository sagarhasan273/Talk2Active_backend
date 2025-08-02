

import { UserRepository } from 'src/repositories/user.repository';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateUserInput, LogInUserInput, UpdateUserInput, UserAccountActivateInput, UserAccountSessionInput, UserAccountUpdateInput, UserType, UserWithoutPassword, UserWithToken } from 'src/types/user.type';
import { AppError } from 'src/utils/errors';
import { JwtService } from './auth/jwt.service';
import { PasswordService } from './auth/password.service';

export class UserService {
  private repository = new UserRepository();

  public async logInUser(input: LogInUserInput): Promise<UserWithToken> {
    try {
      const user = await this.repository.logInUser(input);
      if (!user) {
        throw new AppError('Invalid email or password', 404, 'User Service');
      }
      const { password } = input;

      const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
      if (!isPasswordValid) throw new AppError('Invalid password', 401, 'User Service');

      const token = JwtService.generateToken(user as UserType);
      if (!token) throw new AppError('Failed to generate token.', 500, 'User Service');

      return { user, token };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to log in account!', 500, 'User Service');
    }
  }

  public async createUser(input: CreateUserInput): Promise<UserWithToken> {
    try {

      const user = await this.repository.createUser(input);

      const token = JwtService.generateToken(user as UserType);
      if (!token) throw new AppError('Failed to generate token.', 500, 'User Service');

      return { user, token };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create account!', 500, 'User Service');
    }
  }

  public async getUserById(id: string): Promise<UserWithoutPassword> {
    try {
      const user = await this.repository.getUserById(id);

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to get user by email!', 500, 'User Service');
    }
  }

  public async getUser(token: string): Promise<UserWithoutPassword> {
    try {
      const decodedToken = JwtService.decodeToken(token);
      if (!decodedToken) throw new Error('Invalid token');

      const userId = decodedToken.id;
      if (!userId) throw new AppError('User ID not found in token', 400, 'User Service');

      const user = await this.repository.getUser(userId);

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to get user by ID!', 500, 'User Service');
    }
  }

  public async updateUser(input: UpdateUserInput): Promise<ReturnResponseType> {
    try {
      if (!input.id) throw new AppError('User ID is required', 400, 'User Repository');

      return await this.repository.updateUser(input);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user!', 500, 'User Service');
    }
  }

  public async updateUserAccount(input: UserAccountUpdateInput): Promise<ReturnResponseType> {
    try {
      return await this.repository.updateUserAccount(input);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user account!', 500, 'User Service');
    }
  }

  public async updateUserAccountActivate(input: UserAccountActivateInput): Promise<ReturnResponseType> {
    try {
      if (!input.id) throw new AppError('User ID is required', 400, 'User Repository');

      return await this.repository.updateUserAccountActivate(input);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user!', 500, 'User Service');
    }
  }

  public async updateUserAccountSession(input: UserAccountSessionInput): Promise<ReturnResponseType> {
    try {
      if (!input.id) throw new AppError('User ID is required', 400, 'User Repository');

      return await this.repository.updateUserAccountSession(input);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update user session!', 500, 'User Service');
    }
  }
}

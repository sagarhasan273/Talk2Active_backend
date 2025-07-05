import { DatabaseError } from 'src/database';
import { User, UserWithoutPassword, UserWithToken } from 'src/models/user.model';
import { UserRepository } from 'src/repositories/user.repository';
import { ReturnResponseType } from 'src/types/base.types';

export class UserService {
  private userRepository = new UserRepository();

  public async getUserById(id: string): Promise<UserWithoutPassword | null> {
    try {
      return await this.userRepository.getUserById(id);
    } catch (error) {
      throw new DatabaseError(error as Error, 'Failed to get user by ID');
    }
  }

  public async createUser(
    user: Omit<User, '_id' | 'createAt' | 'updateAt'>
  ): Promise<UserWithToken> {
    try {
      return await this.userRepository.createUser(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to create user');
    }
  }

  public async updateUser(
    user: Omit<User, '_id' | 'createAt' | 'updateAt'>
  ): Promise<ReturnResponseType> {
    try {
      return await this.userRepository.updateUser(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to create user');
    }
  }

  public async getUserByEmail(email: string, password: string): Promise<UserWithToken | null> {
    try {
      return await this.userRepository.getUserByEmail(email, password);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, "User doesn't exist");
      }
      throw new DatabaseError(error as Error, 'Failed to get user by email');
    }
  }

  public async getUser(token: string): Promise<UserWithoutPassword | null> {
    try {
      return await this.userRepository.getUser(token);
    } catch (error) {
      throw new DatabaseError(error as Error, 'Failed to get user by ID');
    }
  }
}

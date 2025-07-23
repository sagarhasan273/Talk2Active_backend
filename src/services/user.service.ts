import { DatabaseError } from 'src/database';

import { UserRepository } from 'src/repositories/user.repository';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateUserInput, LogInUserInput, UserType, UserWithoutPassword, UserWithToken } from 'src/types/user.type';

export class UserService {
  private repository = new UserRepository();

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

  public async logInUser(input: LogInUserInput): Promise<UserWithToken> {
    try {
      return await this.repository.logInUser(input);
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
}

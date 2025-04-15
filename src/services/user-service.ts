import { DatabaseError } from '../database';
import { User, UserWithoutPassword } from '../models/user-model';
import { UserRepository } from '../repositories/user-repository';

export class UserService {
  private userRepository = new UserRepository();

  public async createUser(
    user: Omit<User, '_id' | 'createAt' | 'updateAt'>
  ): Promise<UserWithoutPassword> {
    try {
      return await this.userRepository.createUser(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key error')) {
        throw new DatabaseError(error as Error, 'User already exists');
      }
      throw new DatabaseError(error as Error, 'Failed to create user');
    }
  }

  public async getUserById(id: string): Promise<UserWithoutPassword | null> {
    try {
      return await this.userRepository.getUserById(id);
    } catch (error) {
      throw new DatabaseError(error as Error, 'Failed to get user by ID');
    }
  }
}

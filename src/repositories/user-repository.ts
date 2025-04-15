import { ObjectId } from 'mongodb';
import { User, UserWithoutPassword } from '../models/user-model';

import { getDatabase } from '../database';

export class UserRepository {
  private static collectionName = 'users';

  private async getCollection() {
    const db = await getDatabase();
    return db.collection<User>(UserRepository.collectionName);
  }

  public async createUser(
    user: Omit<User, '_id' | 'createAt' | 'updateAt'>
  ): Promise<UserWithoutPassword> {
    const collection = await this.getCollection();
    const now = new Date();
    const newUser = {
      ...user,
      createAt: now,
      updateAt: now,
    };
    const result = await collection.insertOne(user);
    const { password, ...userWithoutPassword } = { ...newUser, _id: result.insertedId };
    return userWithoutPassword;
  }

  public async getUserById(id: string): Promise<UserWithoutPassword | null> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ _id: new ObjectId(id) });
    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

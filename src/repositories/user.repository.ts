import { ObjectId } from 'mongodb';
import { User, UserWithoutPassword } from 'src/models/user.model';

import { getDatabase } from 'src/database';
import { PasswordService } from 'src/services/auth/password.service';

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
    const passwordHash = await PasswordService.hashPassword(user.password);
    const now = new Date();
    const newUser = {
      ...user,
      password: passwordHash,
      createAt: now,
      updateAt: now,
    };
    const result = await collection.insertOne(newUser);
    const { password, ...userWithoutPassword } = { ...newUser, _id: result.insertedId };
    return userWithoutPassword;
  }

  public async getUserByEmail(
    email: string,
    password: string
  ): Promise<UserWithoutPassword | null> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ email });
    if (!user) return null;

    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
    if (!isPasswordValid) return null;

    const { password: undefined, ...userWithoutPassword } = user;
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

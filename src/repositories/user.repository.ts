import { ObjectId } from 'mongodb';
import { User, UserWithoutPassword, UserWithToken } from 'src/models/user.model';

import { getDatabase } from 'src/database';
import { JwtService } from 'src/services/auth/jwt.service';
import { PasswordService } from 'src/services/auth/password.service';
import { ReturnResponseType } from 'src/types/base.types';

export class UserRepository {
  private static collectionName = 'users';

  private async getCollection() {
    const db = await getDatabase();
    return db.collection<User>(UserRepository.collectionName);
  }

  public async createUser(
    user: Omit<User, '_id' | 'createAt' | 'updateAt'>
  ): Promise<UserWithToken> {
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
    if (!result.acknowledged) throw new Error('Failed to create user');

    const { password, ...userWithoutPassword } = { ...newUser, _id: result.insertedId };

    const token = JwtService.generateToken(user as User);

    return { user: userWithoutPassword, token: token };
  }

  public async updateUser(
    user: Omit<User, 'createdAt' | 'updatedAt'>
  ): Promise<ReturnResponseType> {
    const collection = await this.getCollection();

    if (!user._id) throw new Error('User ID is required');
    const { _id, ...updatableFields } = user;

    await collection.updateOne(
      { _id },
      {
        $set: {
          ...updatableFields,
          updatedAt: new Date(),
        },
      }
    );

    return { message: 'Profile updated successfully', status: true };
  }

  public async getUserByEmail(email: string, password: string): Promise<UserWithToken | null> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ email });
    if (!user) return null;

    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
    if (!isPasswordValid) return null;

    const { password: undefined, ...userWithoutPassword } = user;
    if (!userWithoutPassword) return null;

    const token = JwtService.generateToken(user as User);
    if (!token) return null;

    return { user: userWithoutPassword, token };
  }

  public async getUser(token: string): Promise<UserWithoutPassword | null> {
    const collection = await this.getCollection();

    const decodedToken = JwtService.decodeToken(token);
    if (!decodedToken) return null;

    const userId = decodedToken.id;
    if (!userId) return null;

    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

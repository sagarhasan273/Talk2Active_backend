import * as argon2 from 'argon2';

export class PasswordService {
  public static async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        hashLength: 32,
        timeCost: 4,
        memoryCost: 2 ** 16,
        parallelism: 1,
      });
      return hashedPassword;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Error hashing password: ' + error.message);
      }
      throw new Error('Error hashing password: Unknown error');
    }
  }

  public static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, password);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Error verifying password: ' + error.message);
      }
      throw new Error('Error verifying password: Unknown error');
    }
  }
}

import jwt from 'jsonwebtoken';

import { UserBaseType } from 'src/types/user.type';

export class JwtService {
  private static readonly SECRET = process.env.JWT_SECRET || 'secret';
  private static readonly EXPIRES_IN = '7d';

  public static generateToken(user: UserBaseType): string {
    const payload = { userId: user.userId, email: user.email };
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
  }

  public static verifyToken(token: string): any {
    return jwt.verify(token, this.SECRET);
  }

  public static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

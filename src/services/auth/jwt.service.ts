import jwt from 'jsonwebtoken';

import { UserType } from 'src/types/user.type';

export class JwtService {
  private static readonly SECRET = process.env.JWT_SECRET || 'secret';
  private static readonly EXPIRES_IN = '24h';

  public static generateToken(user: UserType): string {
    const payload = { id: user.id, email: user.email };
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
  }

  public static verifyToken(token: string): any {
    return jwt.verify(token, this.SECRET);
  }

  public static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

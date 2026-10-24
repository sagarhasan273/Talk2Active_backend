import jwt from 'jsonwebtoken';

import { UserBaseType } from 'src/types/user.type';

type ReturnType = {
  userId: string,
  email: string,
  isValid: boolean,
  accountType?: string;
}

export class JwtService {
  private static readonly SECRET = process.env.JWT_SECRET || 'secret';
  private static readonly EXPIRES_IN = '7d';

  public static generateToken(user: UserBaseType): string {
    const payload = { userId: user.userId, email: user.email, accountType: user.accountType };
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
  }

  public static verifyToken(token: string): ReturnType {
    const verify = jwt.verify(token, this.SECRET);

    if (
      typeof verify !== 'object' ||
      verify === null ||
      typeof verify.userId !== 'string' ||
      typeof verify.email !== 'string'
    ) {
      return {
        isValid: false,
        userId: 'Unknown',
        email: "unknown@gmail.com"
      }
    }

    return {
      isValid: true,
      userId: verify.userId,
      email: verify.email,
      accountType: verify.accountType
    }
  }

  public static decodeToken(token: string): ReturnType {
    const decoded = jwt.decode(token);

    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.email !== 'string'
    ) {
      return {
        isValid: false,
        userId: 'Unknown',
        email: "unknown@gmail.com"
      }
    }

    return {
      isValid: true,
      userId: decoded.userId,
      email: decoded.email,
      accountType: decoded.accountType
    };
  }
}

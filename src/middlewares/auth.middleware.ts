import { NextFunction, Request, Response } from 'express';
import { JwtService } from 'src/services/auth/jwt.service';

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string,
        email: string,
        accountType?: string;
      } | null;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Authentication required');
    }

    const decoded = JwtService.verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.accountType !== 'ADMIN') {
    res.status(403).json({ status: false, message: 'Forbidden: Admin access required.' });
    return;
  }
  next();
};

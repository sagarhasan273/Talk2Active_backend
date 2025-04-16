import { NextFunction, Request, Response } from 'express';
import { JwtService } from 'src/services/auth/jwt.service';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

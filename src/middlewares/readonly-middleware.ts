import { NextFunction, Request, Response } from 'express';
import { JwtService } from 'src/services/auth/jwt.service';

export const ReadOnlyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.user = null;

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      next();
      return;
    }

    const decoded = JwtService.verifyToken(token);

    if (decoded.isValid) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

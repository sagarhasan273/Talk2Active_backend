import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from 'src/utils/errors';

export function databaseMiddleware(req: Request, res: Response, next: NextFunction) {
  if (mongoose.connection.readyState !== 1) {
    return next(
      new AppError(
        'Service temporarily unavailable: Database connection is not ready',
        503,
        'DatabaseMiddleware'
      )
    );
  }

  next();
}
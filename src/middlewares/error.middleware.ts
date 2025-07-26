// middlewares/error.middleware.ts
import { NextFunction, Request, Response } from 'express';
import logger from 'src/utils/logger';
import { AppError } from '../utils/errors';

export const errorMiddleware = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message, status: false });
    }

    logger.error(err);
    res.status(500).json({ message: 'Internal Server Error', status: false });
};

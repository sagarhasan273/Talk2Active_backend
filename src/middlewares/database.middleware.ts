import { NextFunction, Request, Response } from 'express';
import { Db } from 'mongodb';
import { getDatabase } from 'src/database';

declare module 'express' {
  interface Request {
    db?: Db;
  }
}

export async function databaseMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const db = await getDatabase();
    req.db = db;
    next();
  } catch (error) {
    next(error);
  }
}

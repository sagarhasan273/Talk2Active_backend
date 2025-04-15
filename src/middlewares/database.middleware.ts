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
    req.db = db; // Attach the database instance to the request object
    next(); // Call the next middleware or route handler
  } catch (error) {
    next(error);
  }
}

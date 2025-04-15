import { Db, MongoClient } from 'mongodb';
import logger from 'src/utils/logger';
import { dbConfig } from './config';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(dbConfig.url, dbConfig.options);
    await client.connect();
    db = client.db(dbConfig.dbName);
    logger.info('Connected to the database.');
    return db;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw new DatabaseError(error as Error, 'initializing database connection!');
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    try {
      await client.close();
      logger.info('Database connection closed.');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}

export class DatabaseError extends Error {
  constructor(
    public readonly originalError: Error,
    public readonly context?: string
  ) {
    const message = `DatabaseError: ${context ? `in ${context}` : `${originalError.message}`}`;
    super(message);
    this.name = 'DatabaseError';
  }
}

process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

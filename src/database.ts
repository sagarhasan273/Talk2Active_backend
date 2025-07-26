import { Db, MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import logger from 'src/utils/logger';
import { dbConfig } from './config';
import { DatabaseError } from './utils/errors';

let client: MongoClient;
let db: Db;

let isConnected = false;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }
  client = new MongoClient(dbConfig.url, dbConfig.options);
  await client.connect();
  db = client.db(dbConfig.dbName);

  try {
    await mongoose.connect(dbConfig.url, dbConfig.options);

    isConnected = true;
    logger.info('Connected to MongoDB via Mongoose');
    return mongoose;
  } catch (error) {
    logger.error('Mongoose connection error:', error);
    throw new DatabaseError(error as Error, 'initializing Mongoose connection');
  }
}

// Optional: Connection event handlers
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from DB');
})

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    try {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed due to app termination');
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


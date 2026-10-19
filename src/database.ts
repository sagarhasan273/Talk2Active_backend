import mongoose from 'mongoose';
import { config } from 'src/config';
import { redisService } from 'src/services/redis.service';
import logger from 'src/utils/logger';

export async function initializeDatabases(): Promise<void> {
  try {
    logger.info('[Database] Initializing connections...');

    // Boot Mongo and Redis at the same time
    await Promise.all([
      mongoose.connect(config.dbUrl, config.dbOptions),
      redisService.initRedisServer()
    ]);

    logger.info('[Database] MongoDB and Redis connected successfully');
  } catch (error) {
    logger.error('[Database] CRITICAL: Failed to connect to databases', { error });
    process.exit(1);
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await mongoose.disconnect();
  await redisService.disconnect();
  logger.info('[Database] Connections safely closed');
}
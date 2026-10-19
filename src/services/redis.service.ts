import Redis, { RedisOptions } from 'ioredis';
import { config } from 'src/config'; // Import the centralized config
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

interface RedisRetryStrategy {
    (times: number): number;
}

interface RedisErrorHandler {
    (err: Error): void;
}

interface RedisReconnectHandler {
    (time: number): void;
}

export class RedisService {
    private client: Redis | null = null;

    /**
     * Lazy-loads the Redis connection using a Singleton pattern.
     */
    public getClient(): Redis {
        if (!this.client) {
            // Use the centralized config instead of process.env directly
            const redisUrl: string | undefined = config.redisUrl;

            if (!redisUrl) {
                throw new AppError(
                    'REDIS_URL configuration is missing on backend',
                    500,
                    'RedisService.getClient'
                );
            }

            const retryStrategy: RedisRetryStrategy = (times: number): number => {
                const delay: number = Math.min(times * 50, 2000);
                logger.info(`[RedisService] Reconnecting in ${delay}ms...`);
                return delay;
            };

            const options: RedisOptions = {
                family: 4,
                retryStrategy,
                maxRetriesPerRequest: null,
                autoResendUnfulfilledCommands: true,
                showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
            };

            this.client = new Redis(redisUrl, options);

            this.client.on('connect', (): void => {
                logger.info('[RedisService] Connected to Redis');
            });
            this.client.on('ready', (): void => {
                logger.info('[RedisService] Redis is ready to receive commands');
            });
            const errorHandler: RedisErrorHandler = (err: Error): void => {
                logger.error('[RedisService] Redis error:', err);
            };
            this.client.on('error', errorHandler);
            this.client.on('close', (): void => {
                logger.warn('[RedisService] Redis connection closed');
            });
            const reconnectHandler: RedisReconnectHandler = (time: number): void => {
                logger.info(`[RedisService] Reconnecting to Redis in ${time}ms`);
            };
            this.client.on('reconnecting', reconnectHandler);
        }
        return this.client;
    }

    /**
     * Initializes the Redis connection on server startup.
     */
    public async initRedisServer(): Promise<void> {
        try {
            const client: Redis = this.getClient();
            await client.ping();
            logger.info('[RedisService] Redis server initialized and pinged successfully');
        } catch (error: unknown) {
            logger.error('[RedisService] CRITICAL: Failed to initialize Redis server on startup', {
                error,
            });
            throw error;
        }
    }

    // =========================================================================
    // Common Production Uses
    // =========================================================================

    public async setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
        try {
            const client: Redis = this.getClient();
            const serializedValue: string =
                typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

            await client.set(key, serializedValue, 'EX', ttlSeconds);
        } catch (error: unknown) {
            logger.error(`[RedisService] Failed to set cache for key: ${key}`, { error });
        }
    }

    public async getCache<T>(key: string): Promise<T | null> {
        try {
            const client: Redis = this.getClient();
            const data: string | null = await client.get(key);

            if (!data) return null;

            try {
                return JSON.parse(data) as T;
            } catch {
                return data as unknown as T;
            }
        } catch (error: unknown) {
            logger.error(`[RedisService] Failed to get cache for key: ${key}`, { error });
            return null;
        }
    }

    public async invalidateCache(key: string): Promise<void> {
        try {
            const client: Redis = this.getClient();
            await client.del(key);
        } catch (error: unknown) {
            logger.error(`[RedisService] Failed to invalidate cache for key: ${key}`, { error });
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            logger.info('[RedisService] Disconnected from Redis safely');
        }
    }
}

export const redisService = new RedisService();

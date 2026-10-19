import { Job, Queue, Worker } from 'bullmq';
import { redisService } from 'src/services/redis.service';
import logger from 'src/utils/logger';

export class QueueService {
    private lobbyQueue: Queue;
    private lobbyWorker: Worker;

    constructor() {
        // Retrieve the existing Singleton connection
        const connection = redisService.getClient();

        // Initialize Queue with the shared connection
        this.lobbyQueue = new Queue('lobby-cleanup', { connection });

        // Initialize Worker with the shared connection
        this.lobbyWorker = new Worker(
            'lobby-cleanup',
            async (job: Job) => {
                const { roomId } = job.data;
                logger.info(`[QueueService] Timer hit zero. Executing cleanup for lobby: ${roomId}`);
            },
            { connection }
        );

        // Bind lifecycle events to your central logger
        this.lobbyWorker.on('completed', (job: Job) => {
            logger.info(`[QueueService] Job ${job.id} completed successfully`);
        });

        this.lobbyWorker.on('failed', (job: Job | undefined, err: Error) => {
            logger.error(`[QueueService] Job ${job?.id} failed`, err);
        });
    }

    /**
     * Schedules a room to be deleted after a specific delay.
     */
    public async scheduleLobbyCleanup(roomId: string, delayMinutes: number = 15): Promise<void> {
        const jobId = `cleanup-${roomId}`;

        await this.lobbyQueue.add(
            'delete-room',
            { roomId },
            {
                jobId,
                delay: delayMinutes * 60 * 1000,
                removeOnComplete: true
            }
        );

        logger.info(`[QueueService] Scheduled cleanup for lobby ${roomId} in ${delayMinutes} minutes`);
    }

    /**
     * Cancels a pending deletion if a user re-joins the room.
     */
    public async cancelLobbyCleanup(roomId: string): Promise<void> {
        const jobId = `cleanup-${roomId}`;
        const job = await this.lobbyQueue.getJob(jobId);

        if (job) {
            await job.remove();
            logger.info(`[QueueService] Cancelled cleanup for lobby ${roomId}`);
        }
    }
}

export const queueService = new QueueService();
import { Job, Queue, Worker } from 'bullmq';
import { redisService } from 'src/services/redis.service';
import { UpdateUserInput } from 'src/types/user.type';
import logger from 'src/utils/logger';
import { UserService } from './user.service';

export class QueueService {
    // 1. Rename to a generic queue for all delayed background tasks
    private tasksQueue: Queue;
    private tasksWorker: Worker;
    private userService: UserService;

    constructor() {
        const connection = redisService.getClient();

        this.userService = new UserService();

        this.tasksQueue = new Queue('delayed-tasks', { connection });

        this.tasksWorker = new Worker(
            'delayed-tasks',
            async (job: Job) => {
                // 2. Route the execution based on the job name
                switch (job.name) {
                    case 'delete-room': {
                        const { roomId } = job.data;
                        logger.info(`[QueueService] Timer hit zero. Executing cleanup for lobby: ${roomId}`);
                        // await liveKitService.deleteRoom(roomId);
                        break;
                    }

                    case 'update-last-active': {
                        const { userId, lastActive } = job.data;
                        logger.info(`[QueueService] Timer hit zero. Updating lastActive for user: ${userId}`);
                        await this.userService.updateUser({ userId, lastActive });
                        break;
                    }

                    default:
                        logger.warn(`[QueueService] Unknown job name: ${job.name}`);
                }
            },
            { connection }
        );

        this.tasksWorker.on('completed', (job: Job) => {
            logger.info(`[QueueService] Job ${job.name}:${job.id} completed successfully`);
        });

        this.tasksWorker.on('failed', (job: Job | undefined, err: Error) => {
            logger.error(`[QueueService] Job ${job?.name}:${job?.id} failed`, err);
        });
    }

    // =========================================================================
    // Lobby Cleanup Methods
    // =========================================================================

    public async scheduleLobbyCleanup(roomId: string, delayMinutes: number = 15): Promise<void> {
        const jobId = `cleanup-${roomId}`;

        await this.tasksQueue.add(
            'delete-room',
            { roomId },
            { jobId, delay: delayMinutes * 60 * 1000, removeOnComplete: true }
        );

        logger.info(`[QueueService] Scheduled cleanup for lobby ${roomId} in ${delayMinutes} minutes`);
    }

    public async cancelLobbyCleanup(roomId: string): Promise<void> {
        const jobId = `cleanup-${roomId}`;
        const job = await this.tasksQueue.getJob(jobId);

        if (job) {
            await job.remove();
            logger.info(`[QueueService] Cancelled cleanup for lobby ${roomId}`);
        }
    }

    // =========================================================================
    // User Offline Status Methods
    // =========================================================================

    /**
     * Call this when the socket disconnects.
     */
    public async scheduleUserOfflineUpdate(data: UpdateUserInput, delayMinutes: number = 5,): Promise<void> {
        const { userId } = data;
        const jobId = `offline-${userId}`;

        await this.tasksQueue.add(
            'update-last-active',
            { ...data },
            { jobId, delay: delayMinutes * 60 * 1000, removeOnComplete: true }
        );

        logger.info(`[QueueService] Scheduled offline update for user ${userId} in ${delayMinutes} minutes`);
    }

    /**
     * Call this if the user reconnects their socket before the 5 minutes is up.
     */
    public async cancelUserOfflineUpdate(userId: string): Promise<void> {
        const jobId = `offline-${userId}`;
        const job = await this.tasksQueue.getJob(jobId);

        if (job) {
            await job.remove();
            logger.info(`[QueueService] Cancelled offline update for user ${userId} (user reconnected)`);
        }
    }
}

export const queueService = new QueueService();
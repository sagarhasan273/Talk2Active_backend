import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export interface CreateJoinTokenOptions {
    userId: string;
    roomId: string;
    userName?: string;
    metadata?: string | Record<string, any>;
    ttl?: string;
}

export class LiveKitService {
    private client: RoomServiceClient | null = null;

    private getCredentials() {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const host = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret) {
            throw new AppError(
                'LiveKit API credentials (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) missing on backend',
                500,
                'LiveKitService.getCredentials'
            );
        }

        return { apiKey, apiSecret, host };
    }

    public getRoomServiceClient(): RoomServiceClient {
        if (!this.client) {
            const { apiKey, apiSecret, host } = this.getCredentials();
            if (!host) {
                throw new AppError(
                    'LIVEKIT_URL configuration is missing on backend',
                    500,
                    'LiveKitService.getRoomServiceClient'
                );
            }
            this.client = new RoomServiceClient(host, apiKey, apiSecret);
        }
        return this.client;
    }

    /**
     * Issues a WebRTC Access Token with default publish/subscribe grants and participant metadata
     */
    public async createJoinToken(options: CreateJoinTokenOptions): Promise<string> {
        const { userId, roomId, userName, metadata, ttl = '24h' } = options;
        const { apiKey, apiSecret } = this.getCredentials();

        const serializedMetadata =
            typeof metadata === 'object' && metadata !== null
                ? JSON.stringify(metadata)
                : metadata;

        const at = new AccessToken(apiKey, apiSecret, {
            identity: String(userId),
            name: userName || String(userId),
            attributes: { roomId: String(roomId) },
            metadata: serializedMetadata,
            ttl,
        });

        at.addGrant({
            room: String(roomId),
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return at.toJwt();
    }

    /**
     * Safely evicts a participant from an active LiveKit WebRTC room
     */
    public async removeParticipant(roomId: string, userId: string): Promise<void> {
        try {
            const client = this.getRoomServiceClient();
            await client.removeParticipant(String(roomId), String(userId));
        } catch (error) {
            logger.error('[LiveKitService] Failed to evict participant from room session', {
                roomId,
                userId,
                error,
            });
        }
    }
}

export const liveKitService = new LiveKitService();
import dotenv from 'dotenv';
import { AccessToken, DataPacket_Kind, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { RoomJoinInput } from 'src/types/chat.type';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';
import { ChatService } from './chat.service';
import { socketService } from './socket.service';
import { UserService } from './user.service';

dotenv.config();

export interface CreateJoinTokenOptions {
  userId: string;
  roomId: string;
  userName?: string;
  metadata?: string | Record<string, any>;
  ttl?: string;
}

export interface JoinRoomRequestResponse {
  token: string;
}

export class LiveKitService {
  private client: RoomServiceClient | null = null;
  private receiver: WebhookReceiver | null = null;

  private userService = new UserService();
  private chatService = new ChatService();

  private getCredentials() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const host = process.env.LIVEKIT_API_URL;

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
   * Lazy-loaded WebhookReceiver instance for cryptographic signature validation
   */
  public getWebhookReceiver(): WebhookReceiver {
    if (!this.receiver) {
      const { apiKey, apiSecret } = this.getCredentials();
      this.receiver = new WebhookReceiver(apiKey, apiSecret);
    }
    return this.receiver;
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
  public async evictParticipant(roomId: string, userId: string): Promise<void> {
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

  public async joinRoomRequest(input: RoomJoinInput): Promise<JoinRoomRequestResponse> {
    const { userId, roomId } = input;
    const participant = await this.userService.getUserById(String(userId));

    const participantMetadata = {
      userId: userId,
      name: participant?.name || 'Participant',
      username: participant?.username || '',
      profilePhoto: participant?.profilePhoto || '',
      accountType: participant?.accountType || 'member',
      verified: participant?.verified || false,
      follower_count: participant?.follower_count,
      following_count: participant?.following_count,
      friend_count: participant?.friend_count,
      bio: participant?.bio,
    };

    const token = await this.createJoinToken({
      userId: String(userId),
      roomId: String(roomId),
      userName: participant?.name,
      metadata: participantMetadata,
    });

    return {
      token,
    };
  }

  public async handleLiveKitWebhook(rawBody: string, authHeader: string): Promise<void> {
    const receiver = this.getWebhookReceiver();


    const event = await receiver.receive(rawBody, authHeader);

    let roomId = event.room?.name;
    let userId = event.participant?.identity;
    let name = event.participant?.name;
    let participant = JSON.parse(event?.participant?.metadata || '{}');

    if (event.participant?.attributes?.roomId) {
      roomId = event.participant.attributes.roomId;
    }


    if (event.event === 'participant_left') {
      logger.info(`[LiveKit Webhook] Participant left: ${userId} from room: ${roomId}`);

      if (roomId && userId) {
        try {
          await this.chatService.leaveRoom({
            roomId: roomId!,
            userId: userId!,
            kicked: false,
          });

          socketService.emitBroadcastUserLeave({
            roomId: String(roomId),
            participantId: String(userId),
          });

          this.broadcastSystemMessage(
            String(roomId),
            `${name} has left the room.`,
            'error'
          );
        } catch (dbError) {
          logger.error('[LiveKit Webhook] DB error on leaveRoom:', dbError);
        }
      } else {
        logger.warn(
          `[LiveKit Webhook] Skipping DB leaveRoom: non-ObjectId received (roomId: ${roomId}, userId: ${userId})`
        );
      }
    }

    if (event.event === 'participant_joined') {
      logger.info(`[LiveKit Webhook] Participant joined: ${userId} from room: ${roomId}`);

      if (roomId && userId) {
        await this.chatService.joinRoom({
          roomId: roomId!,
          userId: userId!
        });

        socketService.emitBroadcastUserJoin({
          roomId: String(roomId),
          participant: participant,
        });

        this.broadcastSystemMessage(
          String(roomId),
          `🎉 ${participant?.name} has joined the room.`,
          'success'
        );
      }
    }
  }

  public async broadcastSystemMessage(
    roomId: string,
    text: string,
    systemType: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    try {
      const client = this.getRoomServiceClient();

      const payload = {
        type: 'CHAT_MESSAGE',
        message: {
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          authorId: 'system',
          authorName: 'System',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
          systemType,
          isSelf: false,
        },
      };

      const data = new TextEncoder().encode(JSON.stringify(payload));

      await client.sendData(String(roomId), data, DataPacket_Kind.RELIABLE, {
        topic: 'room_chat',
      });
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'not_found') return;
      console.error(`[LiveKit] Failed to broadcast system message to ${roomId}:`, error);
    }
  }
}

// Singleton export matching socketService pattern
export const liveKitService = new LiveKitService();
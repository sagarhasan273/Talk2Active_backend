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
  kickOtherDevice?: boolean;
}

export interface JoinRoomRequestResponse {
  token: string;
}

export class LiveKitService {
  private client: RoomServiceClient | null = null;
  private receiver: WebhookReceiver | null = null;

  private userRoomMap = new Map<string, string>();

  private userService = new UserService();
  private chatService = new ChatService();

  private getCredentials() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const host = process.env.LIVEKIT_API_URL;

    if (!apiKey || !apiSecret) {
      throw new AppError(
        'LiveKit API credentials missing on backend',
        500,
        'LiveKitService.getCredentials'
      );
    }

    return { apiKey, apiSecret, host };
  }

  public getRoomServiceClient(): RoomServiceClient {
    if (!this.client) {
      const { apiKey, apiSecret, host } = this.getCredentials();
      if (!host) throw new AppError('LIVEKIT_URL missing on backend', 500, 'LiveKitService');
      this.client = new RoomServiceClient(host, apiKey, apiSecret);
    }
    return this.client;
  }

  public getWebhookReceiver(): WebhookReceiver {
    if (!this.receiver) {
      const { apiKey, apiSecret } = this.getCredentials();
      this.receiver = new WebhookReceiver(apiKey, apiSecret);
    }
    return this.receiver;
  }

  // ── ACTIVE ROOM TRACKER METHODS ──

  public getUserActiveRoom(userId: string): string | null {
    return this.userRoomMap.get(String(userId)) || null;
  }

  public getUsersActiveRooms(userIds: string[]): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const id of userIds) {
      const uid = String(id);
      result[uid] = this.userRoomMap.get(uid) || null;
    }
    return result;
  }

  public setUserActiveRoom(userId: string, roomId: string | null): void {
    const uid = String(userId);
    if (roomId) {
      this.userRoomMap.set(uid, String(roomId));
    } else {
      this.userRoomMap.delete(uid);
    }
  }

  // ── LIVEKIT API METHODS ──

  public async createJoinToken(options: CreateJoinTokenOptions): Promise<string> {
    const { userId, roomId, userName, metadata, ttl = '24h', kickOtherDevice = true } = options;
    const uid = String(userId);
    const targetRoomId = String(roomId);

    // Multi-device switching: Kick from previous room before joining new one
    const previousRoomId = this.getUserActiveRoom(uid);
    if (kickOtherDevice && previousRoomId && previousRoomId !== targetRoomId) {
      await this.evictParticipant(previousRoomId, uid);
    }

    this.setUserActiveRoom(uid, targetRoomId);

    const { apiKey, apiSecret } = this.getCredentials();
    const serializedMetadata = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name: userName || uid,
      attributes: { roomId: targetRoomId },
      metadata: serializedMetadata,
      ttl,
    });

    at.addGrant({
      room: targetRoomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return at.toJwt();
  }

  public async evictParticipant(roomId: string, userId: string): Promise<void> {
    const uid = String(userId);
    const targetRoomId = String(roomId);

    if (this.userRoomMap.get(uid) === targetRoomId) {
      this.userRoomMap.delete(uid);
    }

    try {
      const client = this.getRoomServiceClient();
      await client.removeParticipant(targetRoomId, uid);
    } catch (error) {
      logger.error('[LiveKitService] Failed to evict participant', { roomId, userId, error });
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

    return { token };
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
      await client.sendData(String(roomId), data, DataPacket_Kind.RELIABLE, { topic: 'room_chat' });
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'not_found') return;
      console.error(`[LiveKit] Failed to broadcast system message to ${roomId}:`, error);
    }
  }

  // ── WEBHOOK HANDLER ──

  public async handleLiveKitWebhook(rawBody: string, authHeader: string): Promise<void> {
    const receiver = this.getWebhookReceiver();
    const event = await receiver.receive(rawBody, authHeader);

    let roomId = event.room?.name;
    let userId = event.participant?.identity;
    let name = event.participant?.name;

    if (event.participant?.attributes?.roomId) {
      roomId = event.participant.attributes.roomId;
    }

    let participant = { userId, name };
    try {
      participant = JSON.parse(event?.participant?.metadata || '{}');
    } catch (e) {
      logger.warn(`[LiveKit Webhook] Failed to parse metadata for user ${userId}`);
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

          await this.userService.updateUser({ userId: userId!, lastActive: new Date() })

          if (this.getUserActiveRoom(userId) === roomId) {
            this.setUserActiveRoom(userId, null);
          }

          socketService.emitBroadcastUserLeave({
            roomId: String(roomId),
            participantId: String(userId),
          });

          await this.broadcastSystemMessage(
            String(roomId),
            `${name} has left the room.`,
            'error'
          );
        } catch (dbError) {
          logger.error('[LiveKit Webhook] DB error on leaveRoom:', dbError);
        }
      }
    }

    if (event.event === 'participant_joined') {
      logger.info(`[LiveKit Webhook] Participant joined: ${userId} from room: ${roomId}`);

      if (roomId && userId) {
        this.setUserActiveRoom(userId, roomId);

        await this.chatService.joinRoom({
          roomId: roomId!,
          userId: userId!
        });

        socketService.emitBroadcastUserJoin({
          roomId: String(roomId),
          participant: participant as any,
        });

        await this.broadcastSystemMessage(
          String(roomId),
          `🎉 ${name} has joined the room.`,
          'success'
        );
      }
    }
  }
}

export const liveKitService = new LiveKitService();
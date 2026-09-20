import { Request, Response } from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import {
    RoomCreateSchema,
    RoomJoinSchema,
    RoomLeaveSchema,
    RoomUpdateSchema,
} from 'src/schemas/chat.schema';
import { ChatService } from 'src/services/chat-service';
import { emitBroadcastNewRoom, emitBroadcastUserJoin, emitBroadcastUserLeave } from 'src/socket';
import { RoomParticipantResponse } from 'src/types/chat.type';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class ChatController {
    private chatService = new ChatService();
    private livekitClient: RoomServiceClient | null = null;

    // ── LiveKit Helper ───────────────────────────────────────────────────────
    private getLiveKitCredentials() {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const host = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret) {
            throw new AppError(
                'Voice server configuration is missing on backend',
                500,
                'ChatController.LiveKit'
            );
        }

        return { apiKey, apiSecret, host };
    }

    private getRoomServiceClient(): RoomServiceClient {
        if (!this.livekitClient) {
            const { apiKey, apiSecret, host } = this.getLiveKitCredentials();
            if (!host) {
                throw new AppError(
                    'LIVEKIT_URL configuration is missing on backend',
                    500,
                    'ChatController.getRoomServiceClient'
                );
            }
            this.livekitClient = new RoomServiceClient(host, apiKey, apiSecret);
        }
        return this.livekitClient;
    }

    // ── Controllers ─────────────────────────────────────────────────────────

    public createRoom = async (req: Request, res: Response): Promise<void> => {
        try {
            const currentUserId = req.user?.userId;
            const validatedInput = RoomCreateSchema.parse({
                ...req.body,
                host: currentUserId || req.body.host,
            });

            const newRoom = await this.chatService.createRoom(validatedInput);

            emitBroadcastNewRoom({ room: newRoom });

            res.status(201).json({
                status: true,
                message: 'Room created successfully',
                data: newRoom,
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.createRoom');
        }
    };

    public updateRoom = async (req: Request, res: Response): Promise<void> => {
        try {
            const currentUserId = req.user?.userId;
            const validatedInput = RoomUpdateSchema.parse({
                ...req.body,
                roomId: req.params.roomId || req.body.roomId,
            });

            const updatedRoom = await this.chatService.updateRoom(validatedInput, currentUserId);
            res.status(200).json({
                status: true,
                message: 'Room updated successfully',
                data: updatedRoom,
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.updateRoom');
        }
    };

    public getRooms = async (req: Request, res: Response): Promise<void> => {
        try {
            const currentUserId = req.user?.userId;
            const rooms = await this.chatService.getRooms(currentUserId);

            res.status(200).json({
                status: true,
                message: 'Rooms fetched successfully',
                data: rooms,
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.getRooms');
        }
    };

    public getRoomById = async (req: Request, res: Response): Promise<void> => {
        try {
            const currentUserId = req.user?.userId;
            const { roomId } = req.params;

            const room = await this.chatService.getRoomById(roomId, currentUserId);
            res.status(200).json({
                status: true,
                message: 'Room fetched successfully',
                data: room,
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.getRoomById');
        }
    };

    public joinRoom = async (req: Request, res: Response): Promise<void> => {
        try {
            const { roomId } = req.params;
            const userId = req.user?.userId || req.body.userId;

            // 1. Zod input validation
            const validatedInput = RoomJoinSchema.parse({
                roomId,
                userId,
            });

            // 2. Validate LiveKit credentials before doing DB mutations
            const { apiKey, apiSecret } = this.getLiveKitCredentials();

            // 3. Update database state
            const roomData = await this.chatService.joinRoom(validatedInput);

            // 4. Extract joining participant's public profile from the joined roomData
            const participant = roomData.participants.find(
                (p: any) => p.userId.toString() === validatedInput.userId.toString()
            );

            const participantMetadata = JSON.stringify({
                userId: validatedInput.userId,
                name: participant?.name || 'Participant',
                username: participant?.username || '',
                profilePhoto: participant?.profilePhoto || '',
                isHost: participant?.isHost ?? false,
                ...participant,
            });

            // 5. Issue LiveKit WebRTC Access Token
            const at = new AccessToken(apiKey, apiSecret, {
                identity: String(validatedInput.userId),
                attributes: { roomId: String(roomData.roomId) },
                metadata: participantMetadata,
                ttl: '4h',
            });


            at.addGrant({
                room: validatedInput.roomId.toString(),
                roomJoin: true,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
            });

            const token = await at.toJwt();

            emitBroadcastUserJoin({
                roomId: roomData.roomId.toString(),
                participant: participant as RoomParticipantResponse
            })

            res.status(200).json({
                status: true,
                message: 'Joined room successfully',
                data: {
                    roomId: validatedInput.roomId,
                    token,
                    room: roomData,
                },
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.joinRoom');
        }
    };

    public leaveRoom = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId || req.body.userId;
            const roomId = req.params.roomId || req.body.roomId;

            const validatedInput = RoomLeaveSchema.parse({
                roomId,
                userId,
                kicked: Boolean(req.body.kicked),
            });

            // 1. If user is kicked, evict directly from LiveKit WebRTC session
            if (validatedInput.kicked) {
                try {
                    const roomService = this.getRoomServiceClient();
                    await roomService.removeParticipant(
                        validatedInput.roomId.toString(),
                        validatedInput.userId.toString()
                    );
                } catch (webrtcError) {
                    logger.error('[LiveKit] Failed to evict kicked participant from server session', {
                        roomId: validatedInput.roomId,
                        userId: validatedInput.userId,
                        error: webrtcError,
                    });
                }
            }

            // 2. Update database state via ChatService
            await this.chatService.leaveRoom(validatedInput);

            emitBroadcastUserLeave({
                roomId: roomId.toString(),
                participantId: userId
            })

            res.status(200).json({
                status: true,
                message: 'Left room successfully',
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.leaveRoom');
        }
    };

    // ── Centralized Error Dispatcher ─────────────────────────────────────────
    private handleControllerError(error: unknown, res: Response, source: string): void {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                status: false,
                message: error.message,
                at: error.at,
            });
            return;
        }

        // Zod validation errors
        if (error && typeof error === 'object' && 'issues' in error) {
            res.status(400).json({
                status: false,
                message: 'Invalid input parameters',
                errors: (error as any).issues,
            });
            return;
        }

        // Fallback for unexpected runtime exceptions
        logger.error(`[Unhandled Error in ${source}]:`, error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while processing your request',
        });
    }
}
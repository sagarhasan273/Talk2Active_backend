import { Request, Response } from 'express';
import {
    RoomCreateSchema,
    RoomJoinSchema,
    RoomLeaveSchema,
    RoomUpdateSchema,
} from 'src/schemas/chat.schema';
import { ChatService } from 'src/services/chat.service';
import { LiveKitService } from 'src/services/livekit.service';
import { socketService } from 'src/socket';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class ChatController {
    private chatService = new ChatService();
    private livekitService = new LiveKitService();

    public createRoom = async (req: Request, res: Response): Promise<void> => {
        try {
            const currentUserId = req.user?.userId;
            const validatedInput = RoomCreateSchema.parse({
                ...req.body,
                host: currentUserId || req.body.host,
            });

            const newRoom = await this.chatService.createRoom(validatedInput);

            socketService.emitBroadcastNewRoom({ room: newRoom });

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

            const validatedInput = RoomJoinSchema.parse({ roomId, userId });

            const { room, token } = await this.chatService.joinRoom(validatedInput);

            res.status(200).json({
                status: true,
                message: 'Joined room successfully',
                data: {
                    roomId: validatedInput.roomId,
                    token,
                    room,
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

            await this.chatService.leaveRoom(validatedInput);

            res.status(200).json({
                status: true,
                message: 'Left room successfully',
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.leaveRoom');
        }
    };

    // Inside ChatController:
    public handleBrowserUnloadLeave = async (req: Request, res: Response): Promise<void> => {
        try {
            // Parse the body safely whether it arrives as text/plain or application/json
            const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { roomId, userId } = data;

            if (!roomId || !userId) {
                res.status(400).json({ status: false, message: 'Missing roomId or userId' });
                return;
            }

            logger.info(`[Browser Unload] Removing user ${userId} from room ${roomId}`);

            // 1. Leave in DB
            await this.chatService.leaveRoom({
                roomId,
                userId,
                kicked: false,
            });

            // 2. Broadcast via socket
            socketService.emitBroadcastUserLeave({
                roomId: String(roomId),
                participantId: String(userId),
            });

            res.status(200).json({ status: true, message: 'User removed on unload' });
        } catch (error) {
            logger.error('[Browser Unload Error]:', error);
            res.status(500).json({ status: false, message: 'Failed to process unload leave' });
        }
    };

    /**
     * LiveKit Webhook Handler
     * Automatically triggers when a participant drops, reloads past timeout, or closes the tab.
     */
    public handleLiveKitWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            const receiver = this.livekitService.getWebhookReceiver();
            const authHeader = req.get('Authorization');

            if (!authHeader) {
                logger.error("Authorization Failed");
                res.status(401).json({ status: false, message: 'Missing Authorization header' });
                return;
            }

            // 1. Strictly convert incoming payload to raw UTF-8 string
            let rawBody: string;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body.toString('utf-8');
            } else if (typeof req.body === 'string') {
                rawBody = req.body;
            } else {
                // If another middleware converted it to JSON, fallback to stringifying
                rawBody = JSON.stringify(req.body);
            }

            // 2. Validate HMAC signature and parse event
            const event = await receiver.receive(rawBody, authHeader);

            // 3. Handle participant leaving
            if (event.event === 'participant_left') {
                const roomId = event.room?.name;
                const userId = event.participant?.identity;

                if (roomId && userId) {
                    logger.info(`[LiveKit Webhook] Participant left: ${userId} from ${roomId}`);

                    await this.chatService.leaveRoom({
                        roomId,
                        userId,
                        kicked: false,
                    });

                    socketService.emitBroadcastUserLeave({
                        roomId: roomId.toString(),
                        participantId: userId,
                    });
                }
            }

            // Always reply 200 OK so LiveKit knows the webhook succeeded
            res.status(200).json({ status: true, message: 'Webhook processed' });
        } catch (error) {
            logger.error('[LiveKit Webhook Error]:', error);
            res.status(400).json({ status: false, message: 'Webhook validation failed' });
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

        // Fallback for unhandled runtime exceptions
        logger.error(`[Unhandled Error in ${source}]:`, error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while processing your request',
        });
    }
}
import { Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { RoomCreateSchema, RoomJoinSchema, RoomLeaveSchema, RoomUpdateSchema } from 'src/schemas/chat.schema';
import { ChatService } from 'src/services/chat-service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class ChatController {
    private chatService = new ChatService();

    public async createRoom(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = RoomCreateSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid room create data');
            res.status(400).json({ status: false, message: 'Invalid room creation data' });
            return;
        }

        try {
            const newRoom = await this.chatService.createRoom(validatedInput);
            res.status(200).json({
                status: true,
                message: 'Room created successfully',
                data: newRoom,
            });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while creating room');
            res.status(500).json({ message: 'An error occurred while creating room', status: false });
        }
    }

    public async updateRoom(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = RoomUpdateSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid room update data');
            res.status(400).json({ status: false, message: 'Invalid room update data' });
            return;
        }

        try {
            const updatedRoom = await this.chatService.updateRoom(validatedInput);
            res.status(200).json({
                status: true,
                message: 'Room updated successfully',
                data: updatedRoom,
            });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while updating room');
            res.status(500).json({ message: 'An error occurred while updating room', status: false });
        }
    }

    public async getRooms(req: Request, res: Response): Promise<void> {
        const currentUserId = req.user?.userId;

        try {
            const rooms = await this.chatService.getRooms(currentUserId);

            res.status(200).json({
                status: true,
                message: 'Rooms fetched successfully',
                data: rooms,
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    status: false,
                    message: error.message,
                    at: error.at,
                });
                return;
            }

            logger.error('[Unhandled Exception] ChatController.getRooms', { error });

            res.status(500).json({
                status: false,
                message: 'An unexpected error occurred while fetching rooms',
            });
        }
    }

    public async getRoomById(req: Request, res: Response): Promise<void> {
        const { roomId } = req.params;
        try {
            const room = await this.chatService.getRoomById(roomId);
            res.status(200).json({
                status: true,
                message: 'Room fetched successfully',
                data: room,
            });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching room');
            res.status(500).json({ message: 'An error occurred while fetching room', status: false });
        }
    }

    public async joinRoom(req: Request, res: Response): Promise<void> {
        try {
            const { roomId } = req.params;
            // Prioritize authenticated user from middleware; fallback to body if public
            const userId = req.user?.userId || req.body.userId;
            const { userName, isHost } = req.body;

            // 1. Zod input validation
            const validatedInput = RoomJoinSchema.parse({
                roomId,
                userId,
                isHost: Boolean(isHost),
            });

            // 2. Validate LiveKit credentials early
            const apiKey = process.env.LIVEKIT_API_KEY;
            const apiSecret = process.env.LIVEKIT_API_SECRET;

            if (!apiKey || !apiSecret) {
                throw new AppError(
                    'Voice server configuration is missing on backend',
                    500,
                    'ChatController.joinRoom'
                );
            }

            // 3. Update room database state via ChatService
            const roomData = await this.chatService.joinRoom(validatedInput);

            // 4. Issue LiveKit WebRTC Access Token
            const at = new AccessToken(apiKey, apiSecret, {
                identity: String(validatedInput.userId),
                name: userName || String(validatedInput.userId),
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
    }

    public async leaveRoom(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId || req.body.userId;
            const roomId = req.params.roomId || req.body.roomId;

            const validatedInput = RoomLeaveSchema.parse({
                roomId,
                userId,
                kicked: req.body.kicked,
            });

            await this.chatService.leaveRoom(validatedInput);

            res.status(200).json({
                status: true,
                message: 'Left room successfully',
            });
        } catch (error) {
            this.handleControllerError(error, res, 'ChatController.leaveRoom');
        }
    }

    // ── Centralized Error Dispatcher ────────────────────────────────────────
    private handleControllerError(error: unknown, res: Response, source: string) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                status: false,
                message: error.message,
                at: error.at,
            });
            return;
        }

        // Zod Validation Errors
        if (error && typeof error === 'object' && 'issues' in error) {
            res.status(400).json({
                status: false,
                message: 'Invalid input parameters',
                errors: (error as any).issues,
            });
            return;
        }

        // Fallback for unhandled runtime / system errors
        logger.error(`[Unhandled Error in ${source}]:`, error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while processing your request',
        });
    }
}
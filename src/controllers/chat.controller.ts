import { Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { LeaveRoomSchema, RoomCreateSchema, RoomUpdateSchema } from 'src/schemas/chat.schema';
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
        try {
            const rooms = await this.chatService.getRooms();
            res.status(200).json({
                status: true,
                message: 'Rooms fetched successfully',
                data: rooms,
            });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching rooms');
            res.status(500).json({ message: 'An error occurred while fetching rooms', status: false });
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
            const { userId, userName } = req.body;

            if (!roomId || !userId) {
                res.status(400).json({
                    status: false,
                    message: 'Both roomId and userId are required to join.',
                });
                return;
            }

            // 1. Update database state via ChatService
            let roomData;
            try {
                roomData = await this.chatService.joinRoom({ roomId, userId });
            } catch (serviceError) {
                // If joinRoom in ChatService throws an AppError, log and pass status
                if (serviceError instanceof AppError) {
                    logger.error(`${serviceError.at}: ${serviceError.message}`);
                    res.status(serviceError.statusCode).json({ message: serviceError.message, status: false });
                    return;
                }
            }

            // 2. Validate LiveKit credentials
            const apiKey = process.env.LIVEKIT_API_KEY;
            const apiSecret = process.env.LIVEKIT_API_SECRET;

            if (!apiKey || !apiSecret) {
                logger.error('Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET environment variables');
                res.status(500).json({
                    status: false,
                    message: 'Voice server configuration missing on backend',
                });
                return;
            }

            // 3. Issue LiveKit WebRTC Access Token
            const at = new AccessToken(apiKey, apiSecret, {
                identity: String(userId),
                name: userName || String(userId),
                ttl: '4h',
            });

            at.addGrant({
                room: roomId,
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
                    roomId,
                    token,
                    room: roomData || null,
                },
            });
        } catch (error) {
            logger.error(`Error in joinRoom: ${error}`);
            res.status(500).json({ status: false, message: 'Could not join room' });
        }
    }

    public async leaveRoom(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = LeaveRoomSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid leave room input data');
            res.status(400).json({ status: false, message: 'Invalid leave room input data' });
            return;
        }

        try {
            await this.chatService.leaveRoom(validatedInput);
            res.status(200).json({ status: true, message: 'Left room successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while leaving room');
            res.status(500).json({ message: 'An error occurred while leaving room', status: false });
        }
    }
}
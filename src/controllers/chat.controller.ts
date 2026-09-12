import { Request, Response } from 'express';
import { RoomCreateSchema, RoomUpdateSchema } from 'src/schemas/chat.schema';
import { ChatService } from 'src/services/chat-service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class ChatController {
    private chatService = new ChatService();

    public async createRoom(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = RoomCreateSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid room create data!');
            res.status(400).json({ status: false, message: 'Invalid room creates data!' });
            return;
        }

        try {
            await this.chatService.createRoom(validatedInput);
            res.status(200).json({ status: true, message: 'Room has created successfully', });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while create room!');
            res.status(500).json({ message: 'An error occurred while create room!', status: false });
        }
    }

    public async updateRoom(req: Request, res: Response) {
        let validatedInput;

        try {
            validatedInput = RoomUpdateSchema.parse(req.body);
        } catch (error) {
            console.log(error);
            logger.error('Invalid room update data!');
            res.status(400).json({ status: false, message: 'Invalid room update data!' });
            return;
        }

        try {
            await this.chatService.updateRoom(validatedInput);
            res.status(200).json({ status: true, message: 'Room has created successfully', });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while create room!');
            res.status(500).json({ message: 'An error occurred while create room!', status: false });
        }
    }

    public async getRooms(req: Request, res: Response) {
        try {
            const rooms = await this.chatService.getRooms();
            res.status(200).json({ status: true, message: 'Rooms fetched successfully', data: rooms });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching rooms!');
            res.status(500).json({ message: 'An error occurred while fetching rooms!', status: false });
        }
    }

    public async getRoomById(req: Request, res: Response) {
        const roomId = req.params.roomId;
        try {
            const room = await this.chatService.getRoomById(roomId);
            res.status(200).json({ status: true, message: 'Room fetched successfully', data: room });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching room!');
            res.status(500).json({ message: 'An error occurred while fetching room!', status: false });
        }
    }

    public async joinRoom(req: Request, res: Response) {
        const roomId = req.params.roomId;
        const userId = req.body.userId;

        try {
            await this.chatService.joinRoom(req.body);
            res.status(200).json({ status: true, message: 'Joined room successfully' });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while joining room!');
            res.status(500).json({ message: 'An error occurred while joining room!', status: false });
        }
    }

    public async leaveRoom(req: Request, res: Response) {
        const roomId = req.params.roomId;
        const userId = req.body.userId;
        const name = req.body.name;
        const kicked = req.body?.kicked || false;
        const socketId = req.body.socketId;

        try {
            await this.chatService.leaveRoom({ roomId, userId, name, kicked, socketId });

            res.status(200).json({ status: true, message: 'Left room successfully' });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while leaving room!');
            res.status(500).json({ message: 'An error occurred while leaving room!', status: false });
        }
    }
}
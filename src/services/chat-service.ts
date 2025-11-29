
import { ChatRepository } from "src/repositories/chat.repository";
import { CreateRoomInput, RoomResponse } from "src/types/chat.type";
import { AppError } from "src/utils/errors";

export class ChatService {
    private chatRepository = new ChatRepository();

    async createRoom(input: CreateRoomInput): Promise<void> {
        try {
            await this.chatRepository.createRoom(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create room!', 500, 'Chat Service');
        }
    }

    async getRooms(): Promise<RoomResponse[]> {
        try {
            const rooms = await this.chatRepository.getRooms();
            return rooms;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get rooms!', 500, 'Chat Service');
        }
    }

    async getRoomById(roomId: string): Promise<RoomResponse> {
        try {
            const room = await this.chatRepository.getRoomById(roomId);
            return room;
        } catch (error) {
            if (error instanceof AppError) {

                throw error;
            }
            throw new AppError('Failed to get room by ID!', 500, 'Chat Service');
        }
    }

    async joinRoom(roomId: string, userId: string): Promise<void> {
        try {
            await this.chatRepository.joinRoom(roomId, userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join room!', 500, 'Chat Service');
        }
    }

    async leaveRoom(roomId: string, userId: string): Promise<void> {
        try {
            await this.chatRepository.leaveRoom(roomId, userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave room!', 500, 'Chat Service');
        }
    }
}
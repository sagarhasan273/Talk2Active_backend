import { ChatRepository } from 'src/repositories/chat.repository';
import {
    CreateRoomInput,
    JoinRoomInput,
    LeaveRoomInput,
    RoomBase,
    RoomResponse,
    UpdateRoomInput,
} from 'src/types/chat.type';
import { UserResponseType } from 'src/types/user.type';
import { AppError } from 'src/utils/errors';

export class ChatService {
    private chatRepository = new ChatRepository();

    async createRoom(input: CreateRoomInput): Promise<RoomResponse> {
        try {
            const room = await this.chatRepository.createRoom(input);
            return this.toRoomResponse(room);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create room!', 500, 'Chat Service');
        }
    }

    async updateRoom(input: UpdateRoomInput): Promise<RoomResponse> {
        try {
            const room = await this.chatRepository.updateRoom(input);
            return this.toRoomResponse(room);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update room!', 500, 'Chat Service');
        }
    }

    async getRooms(): Promise<RoomResponse[]> {
        try {
            const rooms = await this.chatRepository.getRooms();
            return rooms.map((room) => this.toRoomResponse(room));
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
            return this.toRoomResponse(room);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get room by ID!', 500, 'Chat Service');
        }
    }

    async joinRoom(input: JoinRoomInput): Promise<RoomResponse> {
        try {
            const room = await this.chatRepository.joinRoom(input);
            return this.toRoomResponse(room);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join room!', 500, 'Chat Service');
        }
    }

    async leaveRoom(input: LeaveRoomInput): Promise<void> {
        try {
            await this.chatRepository.leaveRoom(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave room!', 500, 'Chat Service');
        }
    }

    public toRoomResponse = (room: RoomBase): RoomResponse => ({
        roomId: room.roomId,
        room_key: room.room_key,
        topic: room.topic,
        welcome_message: room.welcome_message,
        max_participants: room.max_participants,
        level: room.level,
        languages: room.languages,
        host: room.host as UserResponseType,
        participants: room.participants as RoomResponse['participants'],
        isActive: room.isActive,
        kickedUserIds: room.kickedUserIds,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
    });
}

import { ChatRepository } from "src/repositories/chat.repository";
import { getSocketHandler } from "src/socket/setup-handler.socket";
import { CreateRoomInput, JoinRoomUserInput, LeaveRoomUserInput, RoomBase, RoomResponse, UpdateRoomInput } from "src/types/chat.type";
import { UserResponseType } from "src/types/user.type";
import { AppError } from "src/utils/errors";
import logger from "src/utils/logger";

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

    async updateRoom(input: UpdateRoomInput): Promise<void> {
        try {
            await this.chatRepository.updateRoom(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update room!', 500, 'Chat Service')
        }
    }

    async getRooms(): Promise<RoomResponse[]> {
        try {
            const rooms = await this.chatRepository.getRooms();

            return rooms.map(room => this.toRoomResponse(room));
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

    async joinRoom(input: JoinRoomUserInput): Promise<void> {
        try {
            const { roomId, userId } = input;

            await this.chatRepository.joinRoom(roomId, userId);

            this.broadcastJoinVoiceRoom(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join room!', 500, 'Chat Service');
        }
    }

    async leaveRoom(input: LeaveRoomUserInput): Promise<void> {
        try {
            await this.chatRepository.leaveRoom(input);

            this.broadcastLeaveVoiceRoom(input)
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave room!', 500, 'Chat Service');
        }
    }

    private broadcastJoinVoiceRoom(input: JoinRoomUserInput): void {
        try {
            // Get socket handler instance
            const socketHandler = getSocketHandler();

            const { roomId, userId, name, socketId } = input
            // Option 1: If SocketHandler exposes io
            if (socketHandler['io']) {
                const targetSocket = socketHandler['io'].sockets.sockets.get(socketId);

                if (targetSocket) {
                    socketHandler['voiceRoomManager'].handleJoinVoiceRoom(targetSocket, input)
                    socketHandler['roomMonitor'].notifyRoomActivity(roomId);
                }

            }
        } catch (error) {
            logger.error('Failed to broadcast new room:', error);
            // Don't throw - broadcasting failure shouldn't stop room creation
        }
    }

    private broadcastLeaveVoiceRoom(input: LeaveRoomUserInput): void {
        try {
            // Get socket handler instance
            const socketHandler = getSocketHandler();

            const { roomId, userId, name } = input

            // Option 1: If SocketHandler exposes io
            if (socketHandler['io']) {
                // socketHandler['io'].emit('user-left', input);
                socketHandler['voiceRoomManager'].handleLeaveVoiceRoom(input)
                socketHandler['roomMonitor'].checkRoomEmpty(roomId);
            }
        } catch (error) {
            logger.error('Failed to broadcast new room:', error);
            // Don't throw - broadcasting failure shouldn't stop room creation
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
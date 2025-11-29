import { RoomModel } from "src/models/chat.model";
import { CreateRoomInput, RoomResponse } from "src/types/chat.type";
import { AppError } from "src/utils/errors";

const commonUserQuery = 'email username name profilePhoto bio status lastActive verified'

export class ChatRepository {
    public async createRoom(input: CreateRoomInput): Promise<void> {
        try {
            const { ...createFields } = input;

            const room = await RoomModel.create({
                ...createFields,
                isActive: true,
            });

            if (!room) {
                throw new AppError('Failed to create room', 404, 'Chat Repository');
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Room!', 500, 'Chat Repository');
        }
    }

    // Get all active rooms
    public async getRooms(): Promise<RoomResponse[]> {
        try {
            const filter = { isActive: true };

            const rooms = await RoomModel.find(filter)
                .populate('host', commonUserQuery)
                .populate('currentParticipants.user', commonUserQuery)
                .sort({ createdAt: -1 });

            return rooms.map((r) => r.toJSON() as unknown as RoomResponse);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Room!', 500, 'Chat Repository');
        }
    };

    public async getRoomById(roomId: string): Promise<RoomResponse> {
        try {
            const room = await RoomModel.findOne
                ({ _id: roomId, isActive: true })

                .populate('host', commonUserQuery)
                .populate('currentParticipants.user', commonUserQuery)
                .sort({ createdAt: -1 });
            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }
            return room.toJSON() as unknown as RoomResponse;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get Room by ID!', 500, 'Chat Repository');
        }
    }

    public async joinRoom(roomId: string, userId: string): Promise<void> {
        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }
            const isAlreadyParticipant = room.currentParticipants.some(participant => participant.user.toString() === userId);

            if (isAlreadyParticipant) {
                throw new AppError('User already joined the room', 400, 'Chat Repository');
            }

            room.currentParticipants.push({ user: userId, joinedAt: new Date() });
            await room.save();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join Room!', 500, 'Chat Repository');
        }
    }

    public async leaveRoom(roomId: string, userId: string): Promise<void> {
        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }
            room.currentParticipants = room.currentParticipants.filter(participant => participant.user.toString() !== userId);
            await room.save();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave Room!', 500, 'Chat Repository');
        }
    }
}
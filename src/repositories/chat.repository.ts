import { ObjectId } from "mongodb";
import { RoomModel } from "src/models/chat.model";
import { getSocketHandler } from "src/socket/setup-handler.socket";
import { CreateRoomInput, LeaveRoomUserInput, RoomResponse, UpdateRoomInput } from "src/types/chat.type";
import { AppError } from "src/utils/errors";
import logger from "src/utils/logger";

const commonUserQuery = 'email username name profilePhoto bio status lastActive verified accountType'

export class ChatRepository {
    public async createRoom(input: CreateRoomInput): Promise<void> {
        try {
            const { ...createFields } = input;

            const room = await RoomModel.create({
                ...createFields,
                isActive: true,
            });

            await room.populate('host', commonUserQuery);

            if (!room) {
                throw new AppError('Failed to create room', 404, 'Chat Repository');
            }

            this.broadcastNewRoom(room);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Room!', 500, 'Chat Repository');
        }
    }

    public async updateRoom(input: UpdateRoomInput): Promise<void> {
        try {
            const { roomId, ...updateFields } = input;

            const room = await RoomModel.findOneAndUpdate(
                {
                    _id: new ObjectId(roomId),
                },
                {
                    $set: {
                        ...updateFields
                    },
                }, {
                new: true,
            }
            ).populate('host', commonUserQuery);

            if (!room) {
                throw new AppError('Failed to update room', 404, 'Chat Repository');
            }

            this.broadcastTransferHost({ roomId: room.id, host: room.host });
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
                ({ _id: new ObjectId(roomId) })

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

            if (!isAlreadyParticipant) {
                if (room.currentParticipants.length >= room.maxParticipants) {
                    throw new AppError('Room is full', 400, 'Chat Repository');
                }
                room.currentParticipants.push({ user: userId, joinedAt: new Date() });
                await room.save();
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join Room!', 500, 'Chat Repository');
        }
    }

    public async leaveRoom(input: LeaveRoomUserInput): Promise<void> {
        try {
            const { roomId, userId, kicked } = input;

            const room = await RoomModel.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }
            room.currentParticipants = room.currentParticipants.filter(participant => participant.user.toString() !== userId);

            if (kicked && !room.kickedUserIds.includes(userId)) {
                room.kickedUserIds.push(userId);
            }

            await room.save();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave Room!', 500, 'Chat Repository');
        }
    }

    private broadcastTransferHost(roomData: any): void {
        try {
            // Get socket handler instance
            const socketHandler = getSocketHandler();

            // Option 1: If SocketHandler exposes io
            if (socketHandler['io']) {
                socketHandler['io'].emit('room-updated-with-participant', {
                    type: 'transfer-host',
                    roomId: roomData?.roomId,
                    host: roomData?.host,
                    message: 'Host changes'
                });
            }
        } catch (error) {
            logger.error('Failed to broadcast new room:', error);
            // Don't throw - broadcasting failure shouldn't stop room creation
        }
    }

    private broadcastNewRoom(roomData: any): void {
        try {
            // Get socket handler instance
            const socketHandler = getSocketHandler();

            // Option 1: If SocketHandler exposes io
            if (socketHandler['io']) {
                socketHandler['io'].emit('new-room-created', {
                    room: roomData,
                    timestamp: new Date(),
                    message: 'A new voice room has been created!'
                });
            }
        } catch (error) {
            logger.error('Failed to broadcast new room:', error);
            // Don't throw - broadcasting failure shouldn't stop room creation
        }
    }


}
import { ObjectId } from 'mongodb';
import { RoomModel } from 'src/models/chat.model';
import {
    CreateRoomInput,
    JoinRoomInput,
    LeaveRoomInput,
    RoomBase,
    UpdateRoomInput,
} from 'src/types/chat.type';
import { AppError } from 'src/utils/errors';
import { generateRoomKey } from 'src/utils/generate.room-key';

const participantQuery = 'genUserId email username name profilePhoto verified accountType';
const hostQuery = 'genUserId email username name profilePhoto verified accountType';

export class ChatRepository {
    public async createRoom(input: CreateRoomInput): Promise<RoomBase> {
        try {
            const { ...createFields } = input;

            const room_key = generateRoomKey();
            if (!room_key) {
                throw new AppError('Failed to generate room key', 500, 'Chat Repository');
            }

            const room = await RoomModel.create({
                ...createFields,
                room_key,
            });

            if (!room) {
                throw new AppError('Failed to create room', 404, 'Chat Repository');
            }

            await room.populate('host', hostQuery);

            return room.toJSON();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Room!', 500, 'Chat Repository');
        }
    }

    public async updateRoom(input: UpdateRoomInput): Promise<RoomBase> {
        try {
            const { roomId, ...updateFields } = input;

            const room = await RoomModel.findOneAndUpdate(
                {
                    _id: new ObjectId(roomId),
                },
                {
                    $set: {
                        ...updateFields,
                    },
                },
                {
                    new: true,
                }
            ).populate('host', hostQuery);

            if (!room) {
                throw new AppError('Failed to update room', 404, 'Chat Repository');
            }

            return room.toJSON();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update Room!', 500, 'Chat Repository');
        }
    }

    public async getRooms(): Promise<RoomBase[]> {
        try {
            const filter = { isActive: true };

            const rooms = await RoomModel.find(filter)
                .populate('host', hostQuery)
                .populate('participants.user', participantQuery)
                .sort({ createdAt: -1 });

            return rooms.map((room) => room.toJSON());
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch rooms!', 500, 'Chat Repository');
        }
    }

    public async getRoomById(roomId: string): Promise<RoomBase> {
        try {
            const room = await RoomModel.findOne({ _id: new ObjectId(roomId) })
                .populate('host', hostQuery)
                .populate('participants.user', participantQuery)
                .sort({ createdAt: -1 });

            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }

            return room.toJSON();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get Room by ID!', 500, 'Chat Repository');
        }
    }

    public async joinRoom(input: JoinRoomInput): Promise<RoomBase> {
        const { roomId, userId } = input;
        try {
            const room = await RoomModel.findById(roomId);

            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }

            const isAlreadyParticipant = room.participants.some(
                (participant) => participant.user.toString() === userId
            );

            if (!isAlreadyParticipant) {
                if (room.participants.length >= room.max_participants) {
                    throw new AppError('Room is full', 400, 'Chat Repository');
                }

                room.participants.push({ user: userId as any, joinedAt: new Date() });
                await room.save();
            }

            await room.populate('host', hostQuery);
            await room.populate('participants.user', participantQuery);

            return room.toJSON();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to join Room!', 500, 'Chat Repository');
        }
    }

    public async leaveRoom(input: LeaveRoomInput): Promise<void> {
        try {
            const { roomId, userId, kicked } = input;

            const room = await RoomModel.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404, 'Chat Repository');
            }

            room.participants = room.participants.filter(
                (participant) => participant.user.toString() !== userId
            );

            if (kicked && !room.kickedUserIds.includes(userId as any)) {
                room.kickedUserIds.push(userId as any);
            }

            await room.save();
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to leave Room!', 500, 'Chat Repository');
        }
    }
}
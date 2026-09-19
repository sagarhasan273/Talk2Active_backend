import { ObjectId } from 'mongodb';
import { RoomModel } from 'src/models/chat.model';
import {
  RoomBase,
  RoomCreateInput,
  RoomJoinInput,
  RoomLeaveInput,
  RoomUpdateInput,
} from 'src/types/chat.type';
import { AppError, DatabaseError } from 'src/utils/errors';
import { generateRoomKey } from 'src/utils/generate.room-key';

const participantQuery = 'genUserId username name profilePhoto verified accountType following_count follower_count friend_count';
const hostQuery = 'genUserId username name profilePhoto verified accountType';

export class ChatRepository {
  public async createRoom(input: RoomCreateInput): Promise<RoomBase> {
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
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create Room!', 500, 'Chat Repository');
    }
  }

  public async updateRoom(input: RoomUpdateInput): Promise<RoomBase> {
    try {
      const { roomId, ...updateFields } = input;

      const room = await RoomModel.findOneAndUpdate(
        { _id: new ObjectId(roomId) },
        { $set: updateFields },
        { new: true }
      ).populate('host', hostQuery);

      if (!room) {
        throw new AppError('Failed to update room', 404, 'Chat Repository');
      }

      return room.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update Room!', 500, 'Chat Repository');
    }
  }

  public async getRooms(): Promise<RoomBase[]> {
    const filter = { isActive: true };
    try {
      const rooms = await RoomModel.find(filter)
        .populate('host', hostQuery)
        .populate('participants.user', participantQuery)
        .sort({ createdAt: -1 });

      return rooms.map((room) => room.toJSON());
    } catch (error) {
      throw new DatabaseError(error, 'ChatRepository.getRooms');
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
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get Room by ID!', 500, 'Chat Repository');
    }
  }

  public async joinRoom(input: RoomJoinInput): Promise<RoomBase> {
    const { roomId, userId } = input;
    const userObjectId = new ObjectId(userId);
    const roomObjectId = new ObjectId(roomId);

    try {
      // 1. Check if room exists and user is eligible (not banned/kicked)
      const existingRoom = await RoomModel.findById(roomObjectId, {
        host: 1,
        participants: 1,
        max_participants: 1,
        kickedUserIds: 1,
      }).lean();

      if (!existingRoom) {
        throw new AppError('Room not found', 404, 'ChatRepository.joinRoom');
      }

      const isKicked = existingRoom.kickedUserIds?.some(
        (kickedId) => kickedId.toString() === userId.toString()
      );
      if (isKicked) {
        throw new AppError('You have been removed from this room', 403, 'ChatRepository.joinRoom');
      }

      const isAlreadyParticipant = existingRoom.participants?.some(
        (p) => p.user.toString() === userId.toString()
      );

      if (!isAlreadyParticipant) {
        if (existingRoom.participants.length >= existingRoom.max_participants) {
          throw new AppError('Room is full', 400, 'ChatRepository.joinRoom');
        }

        const isHost = existingRoom.host.toString() === userId;

        const updatedRoom = await RoomModel.findOneAndUpdate(
          {
            _id: roomObjectId,
            'participants.user': { $ne: userObjectId },
            $expr: { $lt: [{ $size: '$participants' }, '$max_participants'] },
          },
          {
            $push: {
              participants: {
                user: userObjectId,
                joinedAt: new Date(),
                isHost: Boolean(isHost),
              },
            },
          },
          { new: true }
        )
          .populate('host', hostQuery)
          .populate('participants.user', participantQuery);

        if (!updatedRoom) {
          throw new AppError('Room is full or you have already joined', 400, 'ChatRepository.joinRoom');
        }

        return updatedRoom.toJSON();
      }

      // 3. User is already in the room, populate and return current state
      const populatedRoom = await RoomModel.findById(roomObjectId)
        .populate('host', hostQuery)
        .populate('participants.user', participantQuery);

      return populatedRoom!.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.joinRoom');
    }
  }

  public async leaveRoom(input: RoomLeaveInput): Promise<void> {
    const { roomId, userId, kicked } = input;
    const userObjectId = new ObjectId(userId);
    const roomObjectId = new ObjectId(roomId);

    try {
      const room = await RoomModel.findById(roomObjectId);
      if (!room) {
        throw new AppError('Room not found', 404, 'ChatRepository.leaveRoom');
      }

      // Filter out participant
      room.participants = (room.participants || []).filter(
        (p) => p.user.toString() !== userId.toString()
      );

      // Append to banned/kicked list if kicked
      if (kicked) {
        const isAlreadyKicked = (room.kickedUserIds || []).some(
          (kId) => kId.toString() === userId.toString()
        );
        if (!isAlreadyKicked) {
          room.kickedUserIds.push(userObjectId as any);
        }
      }

      // If room is empty, close it
      if (room.participants.length === 0) {
        room.isActive = false;
      } else {
        // If the user who left was the host, reassign to the next oldest participant
        const isLeavingUserHost =
          room.host?.toString() === userId.toString() ||
          (typeof room.host === 'object' &&
            room.host !== null &&
            ((room.host as any).userId || (room.host as any)._id)?.toString() === userId.toString());

        if (isLeavingUserHost) {
          room.participants[0].isHost = true;
          room.host = room.participants[0].user;
        }
      }

      await room.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.leaveRoom');
    }
  }
}
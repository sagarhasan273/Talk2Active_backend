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

// Projections matching the User schema properties
const participantQuery =
  'genUserId username name profilePhoto verified accountType following_count follower_count friend_count';
const hostQuery =
  'genUserId username name profilePhoto verified accountType following_count follower_count friend_count';

export class ChatRepository {
  public async createRoom(input: RoomCreateInput): Promise<RoomBase> {
    try {
      const { host, ...createFields } = input;

      const room_key = generateRoomKey();
      if (!room_key) {
        throw new AppError('Failed to generate room key', 500, 'ChatRepository.createRoom');
      }

      const hostObjectId = new ObjectId(host.toString());

      // Create room with host automatically enrolled as the initial participant
      const room = await RoomModel.create({
        ...createFields,
        host: hostObjectId,
        room_key,
        participants: [],
      });

      if (!room) {
        throw new AppError('Failed to create room', 404, 'ChatRepository.createRoom');
      }

      await room.populate('host', hostQuery);
      await room.populate('participants.user', participantQuery);

      return room.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.createRoom');
    }
  }

  public async updateRoom(input: RoomUpdateInput): Promise<RoomBase> {
    try {
      const { roomId, ...updateFields } = input;

      const room = await RoomModel.findOneAndUpdate(
        { _id: new ObjectId(roomId) },
        { $set: updateFields },
        { new: true }
      )
        .populate('host', hostQuery)
        .populate('participants.user', participantQuery);

      if (!room) {
        throw new AppError('Room not found', 404, 'ChatRepository.updateRoom');
      }

      return room.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.updateRoom');
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
        .populate('participants.user', participantQuery);

      if (!room) {
        throw new AppError('Room not found', 404, 'ChatRepository.getRoomById');
      }

      return room.toJSON();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.getRoomById');
    }
  }

  public async joinRoom(input: RoomJoinInput): Promise<RoomBase> {
    const { roomId, userId } = input;

    try {
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      // 1. Verify eligibility (room existence, bans/kicks)
      const existingRoom = await RoomModel.findById(roomObjectId, {
        host: 1,
        participants: 1,
        max_participants: 1,
        kickedUserIds: 1,
      }).lean();

      if (!existingRoom) {
        throw new AppError('Room not found', 404, 'ChatRepository.joinRoom');
      }

      const isKicked = (existingRoom.kickedUserIds || []).some(
        (kickedId) => kickedId.toString() === userId.toString()
      );
      if (isKicked) {
        throw new AppError('You have been removed from this room', 403, 'ChatRepository.joinRoom');
      }

      const isAlreadyParticipant = (existingRoom.participants || []).some(
        (p) => p.user.toString() === userId.toString()
      );

      // 2. Atomic join if not enrolled
      if (!isAlreadyParticipant) {
        if (existingRoom.participants.length >= existingRoom.max_participants) {
          throw new AppError('Room is full', 400, 'ChatRepository.joinRoom');
        }

        const rawHostId =
          existingRoom.host?.toString?.() || (existingRoom.host as any)?.userId;
        const isHost = rawHostId === userId.toString();

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
          throw new AppError(
            'Room is full or you have already joined',
            400,
            'ChatRepository.joinRoom'
          );
        }

        return updatedRoom.toJSON();
      }

      // 3. User already exists in room, return hydrated document
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

    try {
      const userObjectId = new ObjectId(userId);
      const roomObjectId = new ObjectId(roomId);

      // 1. Prepare atomic update operations
      const updateOperations: any = {
        $pull: {
          // Atomically pull the participant whose "user" matches userId
          // Supports both ObjectId and string matches
          participants: {
            user: { $in: [userObjectId, userId.toString()] },
          },
        },
      };

      // 2. If kicked, atomically add to kickedUserIds without duplicates
      if (kicked) {
        updateOperations.$addToSet = {
          kickedUserIds: userObjectId,
        };
      }

      // 3. Execute atomic update
      const updatedRoom = await RoomModel.findByIdAndUpdate(
        roomObjectId,
        updateOperations,
        { new: true }
      );

      if (!updatedRoom) {
        throw new AppError('Room not found', 404, 'ChatRepository.leaveRoom');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError(error, 'ChatRepository.leaveRoom');
    }
  }
}
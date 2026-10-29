import { ChatRepository } from 'src/repositories/chat.repository';
import {
	RoomBase,
	RoomCreateInput,
	RoomJoinInput,
	RoomLeaveInput,
	RoomResponse,
	RoomUpdateInput
} from 'src/types/chat.type';
import { AppError, DatabaseError } from 'src/utils/errors';

export interface JoinRoomServiceResult {
	room: RoomResponse;
	token: string;
}

export class ChatService {
	private chatRepository = new ChatRepository();

	public async createRoom(input: RoomCreateInput): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.createRoom(input);
			return this.toRoomResponse(room);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to create room!', 500, 'ChatService.createRoom');
		}
	}

	public async updateRoom(input: RoomUpdateInput, currentUserId?: string): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.updateRoom(input);
			if (currentUserId) {
				return this.toRoomResponse(room);
			}
			return this.toRoomResponse(room);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to update room!', 500, 'ChatService.updateRoom');
		}
	}

	public async getRooms(currentUserId?: string): Promise<RoomResponse[]> {
		try {
			const rooms = await this.chatRepository.getRooms();
			if (!rooms.length) return [];

			if (currentUserId) {

				return rooms.map((room) => this.toRoomResponse(room));
			}

			return rooms.map((room) => this.toRoomResponse(room));
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to fetch rooms!', 500, 'ChatService.getRooms');
		}
	}

	public async getRoomById(roomId: string, currentUserId?: string): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.getRoomById(roomId);

			return this.toRoomResponse(room);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to get room by ID!', 500, 'ChatService.getRoomById');
		}
	}

	public async joinRoom(input: RoomJoinInput): Promise<void> {
		try {
			await this.chatRepository.joinRoom(input);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to join room!', 500, 'ChatService.joinRoom');
		}
	}

	public async leaveRoom(input: RoomLeaveInput): Promise<void> {
		const { roomId, userId } = input;

		if (!roomId || !userId) {
			throw new AppError('Invalid roomId or userId format', 400, 'ChatRepository.leaveRoom');
		}
		try {
			await this.chatRepository.leaveRoom(input);
		} catch (error) {
			if (error instanceof AppError) throw error;

			const message =
				error instanceof DatabaseError
					? 'Database failure while updating room state'
					: 'Failed to leave room!';

			throw new AppError(message, 500, 'ChatService.leaveRoom');
		}
	}

	async kickParticipant(
		roomId: string,
		hostId: string,
		userIdToKick: string,
		kickDetails: { reason?: string; ip?: string }
	) {
		const room = await this.chatRepository.getRoomById(roomId);

		if (!room) {
			throw new Error('Room not found');
		}

		const roomHostId =
			typeof room.host === 'object' && room.host !== null && 'userId' in room.host
				? room.host.userId.toString()
				: room.host?.toString();
		if (roomHostId !== hostId) {
			throw new Error('Unauthorized: Only the host can kick participants');
		}

		if (hostId === userIdToKick) {
			throw new Error('Host cannot kick themselves');
		}

		const updatedRoom = await this.chatRepository.kickUserFromRoom(
			roomId,
			userIdToKick,
			kickDetails
		);

		return updatedRoom;
	}

	public toRoomResponse = (
		room: RoomBase & { _id?: any }
	): RoomResponse => {
		const resolvedRoomId = (room.roomId || room._id || (room as any).id)?.toString();

		const hostData = (
			typeof room.host === 'object' && room.host !== null ? room.host : { userId: room.host }
		) as RoomResponse['host'];

		return {
			roomId: resolvedRoomId,
			room_key: room.room_key,
			topic: room.topic,
			welcome_message: room.welcome_message,
			max_participants: room.max_participants,
			level: room.level,
			languages: room.languages,
			host: hostData,
			participants: (room.participants || []).map((p) =>
				this.toParticipantResponse(p, String(hostData.userId))
			),
			isActive: room.isActive,
			kickedUsers: room.kickedUsers,
			createdAt: room.createdAt,
			updatedAt: room.updatedAt,
		};
	};

	public toParticipantResponse = (
		participant: RoomBase['participants'][number],
		hostId: string
	): RoomResponse['participants'][number] => {
		const isUserObject = typeof participant.user === 'object' && participant.user !== null;
		const userData = (
			isUserObject ? participant.user : { userId: participant.user }
		) as RoomResponse['participants'][number];

		userData.joinedAt = participant.joinedAt;
		userData.isHost = Boolean(hostId === userData.userId) ?? false;

		return userData;
	};
}
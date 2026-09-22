import { ChatRepository } from 'src/repositories/chat.repository';
import { RelationshipRepository } from 'src/repositories/social.repository';
import { LiveKitService } from 'src/services/livekit.service';
import {
	RoomBase,
	RoomCreateInput,
	RoomJoinInput,
	RoomLeaveInput,
	RoomParticipantResponse,
	RoomResponse,
	RoomUpdateInput,
} from 'src/types/chat.type';
import { AppError, DatabaseError } from 'src/utils/errors';
import { socketService } from './socket.service';

export interface JoinRoomServiceResult {
	room: RoomResponse;
	token: string;
}

export class ChatService {
	private chatRepository = new ChatRepository();
	private socialRepository = new RelationshipRepository();
	private liveKitService = new LiveKitService();

	private extractId(userOrId: any): string | null {
		if (!userOrId) return null;
		if (typeof userOrId === 'object') {
			const rawId = userOrId.userId || userOrId._id || userOrId.id;
			return rawId ? rawId.toString() : null;
		}
		return userOrId.toString();
	}

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

	public async joinRoom(input: RoomJoinInput): Promise<JoinRoomServiceResult> {
		try {
			const room = await this.chatRepository.joinRoom(input);
			const currentUserId = input.userId.toString();

			const roomResponse = this.toRoomResponse(room);

			const participant = roomResponse.participants.find(
				(p: any) => this.extractId(p) === currentUserId
			);

			const participantMetadata = {
				userId: currentUserId,
				name: participant?.name || 'Participant',
				username: participant?.username || '',
				profilePhoto: participant?.profilePhoto || '',
				accountType: participant?.accountType || 'member',
				verified: participant?.verified || false,
				isHost: participant?.isHost || false,
			};

			const token = await this.liveKitService.createJoinToken({
				userId: currentUserId,
				roomId: String(roomResponse.roomId),
				userName: participant?.name,
				metadata: participantMetadata,
			});

			socketService.emitBroadcastUserJoin({
				roomId: String(room.roomId),
				participant: participant as RoomParticipantResponse,
			});

			return {
				room: roomResponse,
				token,
			};
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to join room!', 500, 'ChatService.joinRoom');
		}
	}

	public async leaveRoom(input: RoomLeaveInput): Promise<void> {
		const { roomId, userId, kicked } = input;

		if (!roomId || !userId) {
			throw new AppError('Invalid roomId or userId format', 400, 'ChatRepository.leaveRoom');
		}
		try {
			if (kicked) {
				await this.liveKitService.evictParticipant(
					input.roomId.toString(),
					input.userId.toString()
				);
			}

			await this.chatRepository.leaveRoom(input);

			socketService.emitBroadcastUserLeave({
				roomId: String(roomId),
				participantId: String(userId),
			});

		} catch (error) {
			if (error instanceof AppError) throw error;

			const message =
				error instanceof DatabaseError
					? 'Database failure while updating room state'
					: 'Failed to leave room!';

			throw new AppError(message, 500, 'ChatService.leaveRoom');
		}
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
			kickedUserIds: room.kickedUserIds,
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
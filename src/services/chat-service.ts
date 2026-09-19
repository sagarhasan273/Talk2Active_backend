import { RelationshipTypeEnum } from 'src/enums/social.enum';
import { ChatRepository } from 'src/repositories/chat.repository';
import { RelationshipRepository } from 'src/repositories/social.repository';
import {
	RoomBase,
	RoomCreateInput,
	RoomJoinInput,
	RoomLeaveInput,
	RoomResponse,
	RoomUpdateInput,
} from 'src/types/chat.type';
import { AppError, DatabaseError } from 'src/utils/errors';

export class ChatService {
	private chatRepository = new ChatRepository();
	private socialRepository = new RelationshipRepository();

	/**
	 * Extracts an ID string whether the input is a populated object or an ObjectId.
	 */
	private extractId(userOrId: any): string | null {
		if (!userOrId) return null;
		if (typeof userOrId === 'object') {
			const rawId = userOrId.userId || userOrId._id || userOrId.id;
			return rawId ? rawId.toString() : null;
		}
		return userOrId.toString();
	}

	/**
	 * Resolves following and blocked status for a batch of target IDs
	 * using a SINGLE MongoDB query.
	 */
	private async getRelationshipSets(
		currentUserId?: string,
		targetIds: string[] = []
	): Promise<{ followingSet: Set<string>; blockedSet: Set<string> }> {
		const followingSet = new Set<string>();
		const blockedSet = new Set<string>();

		if (!currentUserId || targetIds.length === 0) {
			return { followingSet, blockedSet };
		}

		// Deduplicate and remove self
		const uniqueTargets = Array.from(new Set(targetIds)).filter((id) => id !== currentUserId);

		if (uniqueTargets.length === 0) {
			return { followingSet, blockedSet };
		}

		// Single MongoDB roundtrip
		const relationships = await this.socialRepository.getRelationships(
			currentUserId,
			uniqueTargets as [string, ...string[]]
		);

		((relationships as any[] | undefined) || []).forEach((rel: any) => {
			const recipientId = rel.recipient?.toString();
			if (rel.type === RelationshipTypeEnum.FOLLOW) followingSet.add(recipientId);
			if (rel.type === RelationshipTypeEnum.BLOCK) blockedSet.add(recipientId);
		});

		return { followingSet, blockedSet };
	}

	/**
	 * Collects all unique target IDs across multiple rooms.
	 */
	private collectTargetIdsFromRooms(rooms: RoomBase[], currentUserId?: string): string[] {
		const targetIds = new Set<string>();

		for (const room of rooms) {
			const hostId = this.extractId(room.host);
			if (hostId && hostId !== currentUserId) {
				targetIds.add(hostId);
			}

			for (const p of room.participants || []) {
				const participantId = this.extractId(p.user);
				if (participantId && participantId !== currentUserId) {
					targetIds.add(participantId);
				}
			}
		}

		return Array.from(targetIds);
	}

	async createRoom(input: RoomCreateInput, currentUserId?: string): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.createRoom(input);
			const targetIds = this.collectTargetIdsFromRooms([room], currentUserId);
			const { followingSet, blockedSet } = await this.getRelationshipSets(currentUserId, targetIds);
			return this.toRoomResponse(room, followingSet, blockedSet);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to create room!', 500, 'Chat Service');
		}
	}

	async updateRoom(input: RoomUpdateInput, currentUserId?: string): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.updateRoom(input);
			const targetIds = this.collectTargetIdsFromRooms([room], currentUserId);
			const { followingSet, blockedSet } = await this.getRelationshipSets(currentUserId, targetIds);
			return this.toRoomResponse(room, followingSet, blockedSet);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to update room!', 500, 'Chat Service');
		}
	}

	/**
	 * Fetches all rooms and enriches all participants/hosts in a SINGLE relationship query.
	 */
	async getRooms(currentUserId?: string): Promise<RoomResponse[]> {
		try {
			const rooms = await this.chatRepository.getRooms();
			if (!rooms.length) return [];

			if (currentUserId) {
				const { followingSet, blockedSet } = await this.socialRepository.getRelationshipIds(currentUserId);
				return rooms.map((room) => this.toRoomResponse(room, followingSet, blockedSet));
			}

			return rooms.map((room) => this.toRoomResponse(room));
		} catch (error) {
			const message = error instanceof DatabaseError
				? 'Failed to retrieve voice rooms from database'
				: 'Unable to process voice rooms request';

			throw new AppError(message, 500, 'ChatService.getRooms');
		}
	}

	async getRoomById(roomId: string, currentUserId?: string): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.getRoomById(roomId);
			const targetIds = this.collectTargetIdsFromRooms([room], currentUserId);
			const { followingSet, blockedSet } = await this.getRelationshipSets(currentUserId, targetIds);
			return this.toRoomResponse(room, followingSet, blockedSet);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to get room by ID!', 500, 'Chat Service');
		}
	}

	async joinRoom(input: RoomJoinInput): Promise<RoomResponse> {
		try {
			const room = await this.chatRepository.joinRoom(input);
			const currentUserId = input.userId.toString();

			const { followingSet, blockedSet } = await this.socialRepository.getRelationshipIds(currentUserId);

			return this.toRoomResponse(room, followingSet, blockedSet);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			const message = error instanceof DatabaseError
				? 'Failed to join room due to database error'
				: 'An unexpected error occurred while joining room';

			throw new AppError(message, 500, 'ChatService.joinRoom');
		}
	}

	async leaveRoom(input: RoomLeaveInput): Promise<void> {
		try {
			await this.chatRepository.leaveRoom(input);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError('Failed to leave room!', 500, 'Chat Service');
		}
	}

	public toRoomResponse = (
		room: RoomBase,
		followingSet?: Set<string>,
		blockedSet?: Set<string>
	): RoomResponse => {
		const hostData = (
			typeof room.host === 'object' && room.host !== null ? room.host : { userId: room.host }
		) as RoomResponse['host'];
		const hostId = this.extractId(hostData);
		hostData.isFollowing = hostId ? (followingSet?.has(hostId) ?? false) : false;
		hostData.isBlocked = hostId ? (blockedSet?.has(hostId) ?? false) : false;

		return {
			roomId: room.roomId,
			room_key: room.room_key,
			topic: room.topic,
			welcome_message: room.welcome_message,
			max_participants: room.max_participants,
			level: room.level,
			languages: room.languages,
			host: hostData,
			participants: (room.participants || []).map((p) =>
				this.toParticipantResponse(p, followingSet, blockedSet)
			),
			isActive: room.isActive,
			kickedUserIds: room.kickedUserIds,
			createdAt: room.createdAt,
			updatedAt: room.updatedAt,
		};
	};

	public toParticipantResponse = (
		participant: RoomBase['participants'][number],
		followingSet?: Set<string>,
		blockedSet?: Set<string>
	): RoomResponse['participants'][number] => {
		const isUserObject = typeof participant.user === 'object' && participant.user !== null;
		const userData = (
			isUserObject ? participant.user : { userId: participant.user }
		) as RoomResponse['participants'][number];

		const targetId = this.extractId(userData);

		userData.joinedAt = participant.joinedAt;
		userData.isHost = participant.isHost ?? false;
		userData.isFollowing = targetId ? (followingSet?.has(targetId) ?? false) : false;
		userData.isBlocked = targetId ? (blockedSet?.has(targetId) ?? false) : false;

		return userData;
	};
}

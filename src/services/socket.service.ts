// src/services/socket.service.ts

import { ObjectId } from 'mongodb';
import { Server, Socket } from 'socket.io';
import { RelationshipStatusEnum, RelationshipTypeEnum } from '../enums/social.enum';
import { RelationshipModel } from '../models/social.model';
import { UserModel } from '../models/user.model';
import {
    BroadcastNewRoomData,
    BroadcastUserJoinData,
    BroadcastUserLeaveData,
} from '../types/socket.type';
import logger from '../utils/logger';

export interface SocketMessagePayload {
    id: string;
    text: string;
    authorId?: string;
    authorName?: string;
    recipientId?: string;
    editedAt?: number;
    reactions?: Array<{
        emoji: string;
        count: number;
        reactedBySelf: boolean;
    }>;
    replyToId?: string;
    createdAt?: string;
}

export interface SocketReactionPayload {
    messageId: string;
    reactions: Array<{
        emoji: string;
        count: number;
        reactedBySelf: boolean;
    }>;
}

export class SocketService {
    private io: Server | null = null;
    private userSocketsMap: Map<string, Set<string>> = new Map();
    // Track which room a user is currently active in: Map<userId, roomId>
    private userActiveRoomMap: Map<string, string> = new Map();

    constructor() { }

    public setIO(ioInstance: Server): void {
        this.io = ioInstance;
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error('Socket.io has not been initialized. Call initSocketServer first.');
        }
        return this.io;
    }

    public isUserInAnyRoom(userId: string): boolean {
        return this.userActiveRoomMap.has(userId);
    }

    /**
     * O(K) In-Memory Batch Check: Returns which user IDs from a list are currently in a room
     */
    /**
     * Returns an object mapping user IDs to their current active room ID ({ [userId]: roomId })
     */
    public getActiveRoomUserIds(userIds: string[]): Record<string, string> {
        if (!Array.isArray(userIds)) return {};

        const result: Record<string, string> = {};
        for (const id of userIds) {
            const strId = String(id);
            if (this.isUserInAnyRoom(strId)) {
                result[strId] = this.userActiveRoomMap.get(strId)!;
            }
        }
        return result;
    }

    /**
     * Fetches all unique Follower + Following IDs for targeted presence broadcasting
     */
    private async getRelatedUserIds(userId: string): Promise<string[]> {
        try {
            const userObjId = new ObjectId(userId);
            const relations = await RelationshipModel.find(
                {
                    $or: [{ requester: userObjId }, { recipient: userObjId }],
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED,
                },
                { requester: 1, recipient: 1 }
            ).lean();

            const relatedSet = new Set<string>();
            for (const rel of relations) {
                const reqStr = rel.requester?.toString();
                const recStr = rel.recipient?.toString();
                if (reqStr && reqStr !== userId) relatedSet.add(reqStr);
                if (recStr && recStr !== userId) relatedSet.add(recStr);
            }

            return Array.from(relatedSet);
        } catch (err) {
            logger.error('Failed to fetch related user IDs for room presence:', err);
            return [];
        }
    }

    /**
     * Emits room presence updates ONLY to the user's online followers & following
     */
    private async notifyRoomPresenceToRelations(userId: string, isInRoom: boolean, roomId?: string | null): Promise<void> {
        if (!this.io) return;

        const relatedIds = await this.getRelatedUserIds(userId);
        if (relatedIds.length === 0) return;

        // Filter to only emit to connected sockets of relations who have loaded the app
        const onlineTargetSockets: string[] = [];
        for (const relId of relatedIds) {
            const sockets = this.userSocketsMap.get(relId);
            if (sockets && sockets.size > 0) {
                onlineTargetSockets.push(...Array.from(sockets));
            }
        }

        if (onlineTargetSockets.length === 0) return;

        const lastActive = new Date().toISOString();

        // Broadcast room status change specifically to relevant peers
        this.io.to(onlineTargetSockets).emit('user_status_changed', {
            userId,
            isOnline: isInRoom,
            status: isInRoom ? 'online' : 'offline',
            roomId: roomId || null,
            lastActive,
        });
    }

    public handleConnection(socket: Socket): void {
        let currentUserId: string | null = null;

        // 1. User connects and registers app session
        socket.on('join_global_chat', (userId: string) => {
            if (!userId) return;
            currentUserId = String(userId);
            socket.join(currentUserId);

            if (!this.userSocketsMap.has(currentUserId)) {
                this.userSocketsMap.set(currentUserId, new Set());
            }
            this.userSocketsMap.get(currentUserId)!.add(socket.id);
        });

        // 2. Client requests initial room active status snapshot for loaded friends/relations
        socket.on(
            'check_online_users',
            (userIds: string[], callback?: (activeIds: Record<string, string>) => void) => {
                const activeIds = this.getActiveRoomUserIds(userIds);
                if (typeof callback === 'function') {
                    callback(activeIds);
                } else {
                    socket.emit('online_users_snapshot', activeIds);
                }
            }
        );

        // 3. User disconnects completely
        socket.on('disconnect', async () => {
            if (!currentUserId) return;

            if (this.userSocketsMap.has(currentUserId)) {
                const userSockets = this.userSocketsMap.get(currentUserId)!;
                userSockets.delete(socket.id);

                if (userSockets.size === 0) {
                    this.userSocketsMap.delete(currentUserId);

                    // If they were inside a room when disconnecting, clean up and notify peers
                    if (this.userActiveRoomMap.has(currentUserId)) {
                        const activeRoomId = this.userActiveRoomMap.get(currentUserId)!;
                        this.userActiveRoomMap.delete(currentUserId);

                        await UserModel.updateOne(
                            { _id: new ObjectId(currentUserId) },
                            { $set: { lastActive: new Date() } }
                        ).catch(() => { });

                        await this.notifyRoomPresenceToRelations(currentUserId, false, null);

                        // Broadcast leave event to the room participants
                        this.emitBroadcastUserLeave({
                            roomId: activeRoomId,
                            participantId: currentUserId,
                        });
                    }
                }
            }
        });
    }

    public emitNewMessage(recipientId: string, message: SocketMessagePayload): void {
        this.io?.to(recipientId).emit('receive_new_message', message);
    }

    public emitMessageEdited(recipientId: string, message: SocketMessagePayload): void {
        this.io?.to(recipientId).emit('message_edited', message);
    }

    public emitReactionToggled(recipientId: string, payload: SocketReactionPayload): void {
        this.io?.to(recipientId).emit('message_reaction', payload);
    }

    public emitMessagesRead(senderId: string, recipientId: string): void {
        this.io?.to(senderId).emit('messages_read', { readBy: recipientId });
    }

    public emitBroadcastNewRoom(data: BroadcastNewRoomData): void {
        this.io?.emit('broadcast_new_room', data);
    }

    public emitBroadcastUserJoin(data: BroadcastUserJoinData): void {
        const participantUserId = String(data.participant?.userId || '');
        if (participantUserId && data.roomId) {
            this.userActiveRoomMap.set(participantUserId, data.roomId);
            this.notifyRoomPresenceToRelations(participantUserId, true, data.roomId);
        }
        this.io?.emit('broadcast_user_join', data);
    }

    public emitBroadcastUserLeave(data: BroadcastUserLeaveData): void {
        if (data.participantId) {
            this.userActiveRoomMap.delete(data.participantId);
            this.notifyRoomPresenceToRelations(data.participantId, false, null);
        }
        this.io?.emit('broadcast_user_leave', data);
    }
}

export const socketService = new SocketService();
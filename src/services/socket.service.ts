import { Server, Socket } from 'socket.io';

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

    public isUserOnline(userId: string): boolean {
        return this.userSocketsMap.has(userId) && (this.userSocketsMap.get(userId)?.size ?? 0) > 0;
    }

    public handleConnection(socket: Socket): void {
        let currentUserId: string | null = null;
        let currentRoomId: string | null = null;

        socket.on('join_room', (roomId: string) => {
            currentRoomId = roomId;
            logger.info(`join_room: ${currentUserId} => ${roomId}`);
        });

        socket.on('join_global_chat', (userId: string) => {
            if (!userId) return;

            currentUserId = userId;
            socket.join(userId);

            if (!this.userSocketsMap.has(userId)) {
                this.userSocketsMap.set(userId, new Set());
            }
            this.userSocketsMap.get(userId)!.add(socket.id);

            this.io?.emit('user_status_changed', { userId, status: 'online' });
        });

        socket.on('disconnect', async () => {
            try {
                if (currentUserId && this.userSocketsMap.has(currentUserId)) {
                    const userSockets = this.userSocketsMap.get(currentUserId)!;
                    userSockets.delete(socket.id);

                    if (userSockets.size === 0) {
                        this.userSocketsMap.delete(currentUserId);
                        this.io?.emit('user_status_changed', { userId: currentUserId, status: 'offline' });
                    }
                }
            } catch (disconnectErr) {
                logger.error('Error in socket disconnect handler:', disconnectErr);
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
        this.io?.emit('broadcart_new_room', data);
    }

    public emitBroadcastUserJoin(data: BroadcastUserJoinData): void {
        this.io?.emit('broadcart_user_join', data);
    }

    public emitBroadcastUserLeave(data: BroadcastUserLeaveData): void {
        this.io?.emit('broadcart_user_leave', data);
    }
}

// Now safe to instantiate as a singleton
export const socketService = new SocketService();
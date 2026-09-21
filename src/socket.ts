import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ChatService } from './services/chat-service';
import { BroadcastNewRoomData, BroadcastUserJoinData, BroadcastUserLeaveData } from './types/socket.type';
import logger from './utils/logger';

let io: Server | null = null;

// Track online sockets per user (handles multiple open tabs/devices)
const userSocketsMap = new Map<string, Set<string>>();

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

/**
 * Initialize Socket.io instance with the HTTP server
 */

const chatService = new ChatService()

export const initSocketServer = (httpServer: HttpServer, allowedOrigins: string[] = ['*']): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PATCH'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket: Socket) => {
        let currentUserId: string | null = null;
        let currentRoomId: string | null = null;

        socket.on('join_room', (roomId: string) => {
            currentRoomId = roomId;
            logger.info(`join_room: ${currentUserId} => ${roomId}`);
        })

        // Join user to their personal direct-message room
        socket.on('join_global_chat', (userId: string) => {
            if (!userId) return;

            currentUserId = userId;

            socket.join(userId);

            if (!userSocketsMap.has(userId)) {
                userSocketsMap.set(userId, new Set());
            }
            userSocketsMap.get(userId)!.add(socket.id);

            // Broadcast user online status to mutual listeners if required
            io?.emit('user_status_changed', { userId, status: 'online' });
        });

        // Cleanup on disconnect
        socket.on('disconnect', async () => {
            try {
                if (currentUserId && userSocketsMap.has(currentUserId)) {
                    const userSockets = userSocketsMap.get(currentUserId)!;
                    userSockets.delete(socket.id);

                    if (currentRoomId && currentRoomId !== 'null' && currentRoomId.trim().length === 24) {
                        logger.info(`User Left Room on Disconnect: ${currentUserId} => ${currentRoomId}`);

                        try {
                            await chatService.leaveRoom({
                                roomId: currentRoomId,
                                userId: currentUserId,
                                kicked: false,
                            });

                            emitBroadcastUserLeave({
                                roomId: currentRoomId,
                                participantId: currentUserId,
                            });
                        } catch (roomLeaveErr) {
                            logger.error('Failed to leave room on socket disconnect:', roomLeaveErr);
                        }
                    }

                    if (userSockets.size === 0) {
                        userSocketsMap.delete(currentUserId);
                        io?.emit('user_status_changed', { userId: currentUserId, status: 'offline' });
                    }
                }
            } catch (disconnectErr) {
                logger.error('Error in socket disconnect handler:', disconnectErr);
            }
        });
    });

    return io;
};

/**
 * Access the initialized Socket.io server instance
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io has not been initialized. Call initSocketServer first.');
    }
    return io;
};

/**
 * Check if a target user currently has an active socket session
 */
export const isUserOnline = (userId: string): boolean => {
    return userSocketsMap.has(userId) && (userSocketsMap.get(userId)?.size ?? 0) > 0;
};

/* ------------------------------------------------------------------ */
/*  Helper Dispatch Functions (Call these in your MessageService)     */
/* ------------------------------------------------------------------ */

/**
 * Dispatches a newly created chat message to the recipient's room
 */
export const emitNewMessage = (recipientId: string, message: SocketMessagePayload): void => {
    if (!io) return;
    io.to(recipientId).emit('receive_new_message', message);
};

/**
 * Dispatches an edited message payload to the recipient's room
 */
export const emitMessageEdited = (recipientId: string, message: SocketMessagePayload): void => {
    if (!io) return;
    io.to(recipientId).emit('message_edited', message);
};

/**
 * Dispatches an updated reaction array to the recipient's room
 */
export const emitReactionToggled = (
    recipientId: string,
    payload: SocketReactionPayload
): void => {
    if (!io) return;
    io.to(recipientId).emit('message_reaction', payload);
};

// ... inside your src/core/socket.ts file ...

export const emitMessagesRead = (senderId: string, recipientId: string): void => {
    const io = getIO();
    if (!io) return;
    // Let the sender know that the recipient has read their messages
    io.to(senderId).emit('messages_read', { readBy: recipientId });
};

// ... broadcast new room ....

export const emitBroadcastNewRoom = (data: BroadcastNewRoomData): void => {
    const io = getIO();
    if (!io) return;
    // Let the sender know that the recipient has read their messages
    io.emit('broadcart_new_room', data);
};

// ... broadcast user join ....

export const emitBroadcastUserJoin = (data: BroadcastUserJoinData): void => {
    const io = getIO();
    if (!io) return;
    // Let the sender know that the recipient has read their messages
    io.emit('broadcart_user_join', data);
};

// ... broadcast user leave ....

export const emitBroadcastUserLeave = (data: BroadcastUserLeaveData): void => {
    const io = getIO();
    if (!io) return;
    // Let the sender know that the recipient has read their messages
    io.emit('broadcart_user_leave', data);
};
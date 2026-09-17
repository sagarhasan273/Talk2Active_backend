import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

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
        socket.on('disconnect', () => {
            if (currentUserId && userSocketsMap.has(currentUserId)) {
                const userSockets = userSocketsMap.get(currentUserId)!;
                userSockets.delete(socket.id);

                if (userSockets.size === 0) {
                    userSocketsMap.delete(currentUserId);
                    io?.emit('user_status_changed', { userId: currentUserId, status: 'offline' });
                }
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
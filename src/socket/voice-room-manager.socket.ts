import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ParticipantData, UserData } from '../types/socket.type';
import logger from '../utils/logger';

export class VoiceRoomManager {
    private io: Server;
    private voiceRooms = new Map<string, Set<string>>(); // roomId -> socketIds
    private usersRooms = new Map<string, string>(); // socketId -> roomId
    private usersData = new Map<string, UserData>(); // socketId -> UserData

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Handle user joining a voice room
     */
    public handleJoinVoiceRoom(socket: Socket, data: UserData): void {
        const { roomId, userId, name, ...userBasicInfo } = data;

        try {
            // Store user data
            this.usersData.set(socket.id, { roomId, userId, name, ...userBasicInfo });

            // Leave previous room if any
            const previousRoomId = this.leavePreviousRoom(socket);

            // Join new room
            this.joinRoom(socket, roomId);

            // Get current participants
            const participants = this.getRoomParticipants(roomId, socket.id);

            logger.info(`📊 Room ${roomId} now has ${participants.length + 1} participants`);

            // Send existing participants to the new user
            this.sendExistingParticipants(socket, roomId, participants);

            // Notify others about the new user
            this.broadcastUserJoined(socket, roomId, previousRoomId, { userId, name, isLocal: false, ...userBasicInfo });

            // Send system messages
            this.sendSystemMessages(socket, roomId, { userId, name, profilePhoto: data.profilePhoto });

        } catch (error) {
            logger.error('❌ Error joining voice room:', error);
            socket.emit('join-error', { error: 'Failed to join voice room' });
        }
    }

    /**
     * Handle user leaving a voice room
     */
    public handleLeaveVoiceRoom(socket: Socket, data: { roomId: string, userId: string, name: string }): void {
        const { roomId, userId, name } = data;
        const userInfo = this.usersData.get(socket.id);

        logger.info(`🚪 User ${userInfo?.name || name} (${socket.id}) leaving room ${roomId}`);

        // Leave the room
        this.leaveRoom(socket, roomId);

        // Remove user data
        this.removeUserData(socket.id);

        // Broadcast user left to room
        this.broadcastUserLeft(socket, roomId, userId, userInfo?.name || name);

        // Send system message
        this.sendUserLeftSystemMessage(socket, roomId, userId, name);
    }

    /**
     * Handle user disconnection
     */
    public handleDisconnect(socket: Socket): void {
        const userInfo = this.usersData.get(socket.id);
        const roomId = this.usersRooms.get(socket.id);

        if (roomId) {
            // Leave the room
            socket.leave(roomId);
            this.usersRooms.delete(socket.id);

            // Clean up room data
            this.cleanupRoomData(roomId, socket.id);

            // Broadcast user left
            socket.to(roomId).emit('user-left', {
                userId: userInfo?.userId,
                socketId: socket.id,
                name: userInfo?.name
            });

            // Send system message if needed
            if (userInfo) {
                this.sendUserLeftSystemMessage(socket, roomId, userInfo.userId, userInfo.name, false);
            }
        }

        this.usersData.delete(socket.id);
    }

    /**
     * Get user data by socket ID
     */
    public getUserData(socketId: string): UserData | undefined {
        return this.usersData.get(socketId);
    }

    /**
     * Get room ID for a socket
     */
    public getRoomForSocket(socketId: string): string | undefined {
        return this.usersRooms.get(socketId);
    }

    /**
     * Get all participants in a room
     */
    public getRoomParticipants(roomId: string, excludeSocketId?: string): ParticipantData[] {
        const participants: ParticipantData[] = [];
        const socketIds = this.voiceRooms.get(roomId) || new Set();

        Array.from(socketIds).forEach(socketId => {
            if (socketId !== excludeSocketId) {
                const userData = this.usersData.get(socketId);
                if (userData) {
                    participants.push({
                        ...userData,
                        socketId,
                        id: userData.userId,
                        isMuted: userData.isMuted,
                        isLocal: false
                    });
                }
            }
        });

        return participants;
    }

    /**
     * Check if user is in a room
     */
    public isUserInRoom(socketId: string, roomId: string): boolean {
        const userRoom = this.usersRooms.get(socketId);
        return userRoom === roomId;
    }

    /**
     * Private helper methods
     */
    private leavePreviousRoom(socket: Socket): string | undefined {
        const previousRoomId = this.usersRooms.get(socket.id);
        if (previousRoomId) {
            socket.leave(previousRoomId);

            const userData = this.usersData.get(socket.id);
            if (userData) {
                socket.to(previousRoomId).emit('user-left', {
                    userId: userData.userId,
                    socketId: socket.id,
                    name: userData.name
                });
            }

            if (this.voiceRooms.has(previousRoomId)) {
                this.voiceRooms.get(previousRoomId)?.delete(socket.id);
            }
            return previousRoomId
        }
        return undefined
    }

    private joinRoom(socket: Socket, roomId: string): void {
        socket.join(roomId);
        this.usersRooms.set(socket.id, roomId);

        if (!this.voiceRooms.has(roomId)) {
            this.voiceRooms.set(roomId, new Set());
        }
        this.voiceRooms.get(roomId)?.add(socket.id);
    }

    private leaveRoom(socket: Socket, roomId: string): void {
        socket.leave(roomId);
        this.usersRooms.delete(socket.id);

        if (this.voiceRooms.has(roomId)) {
            this.voiceRooms.get(roomId)?.delete(socket.id);
            if (this.voiceRooms.get(roomId)?.size === 0) {
                this.voiceRooms.delete(roomId);
            }
        }
    }

    private removeUserData(socketId: string): void {
        this.usersRooms.delete(socketId);
        this.usersData.delete(socketId);
    }

    private cleanupRoomData(roomId: string, socketId: string): void {
        if (this.voiceRooms.has(roomId)) {
            this.voiceRooms.get(roomId)?.delete(socketId);
            if (this.voiceRooms.get(roomId)?.size === 0) {
                this.voiceRooms.delete(roomId);
            }
        }
    }

    private sendExistingParticipants(socket: Socket, roomId: string, participants: ParticipantData[]): void {
        socket.emit('existing-participants', {
            participants,
            roomId
        });
    }

    private broadcastUserJoined(socket: Socket, roomId: string, previousRoomId: string | undefined, userData: any): void {
        socket.to(roomId).emit('user-joined', {
            ...userData,
            socketId: socket.id
        });

        this.io.emit('room-updated-with-participant', {
            joinInfo: {
                roomId,
                participant: userData
            },
            ...(previousRoomId && {
                leaveInfo: {
                    roomId: previousRoomId,
                    participant: userData
                }
            })
        });

        this.io.emit('recent-room-updated-with-participant', {
            joinInfo: {
                roomId,
                participant: userData
            },
            ...(previousRoomId && {
                leaveInfo: {
                    roomId: previousRoomId,
                    participant: userData
                }
            })
        });
    }

    private broadcastUserLeft(socket: Socket, roomId: string, userId: string, name: string): void {
        socket.to(roomId).emit('user-left', {
            userId,
            socketId: socket.id,
            name
        });

        this.io.emit('room-updated-with-participant', {
            leaveInfo: {
                roomId,
                participant: { userId, name }
            }
        });

        this.io.emit('recent-room-updated-with-participant', {
            leaveInfo: {
                roomId,
                participant: { userId, name }
            }
        });
    }

    private sendSystemMessages(socket: Socket, roomId: string, senderInfo: { userId: string, name: string, profilePhoto: string }): void {
        const time = new Date();

        // Notify others
        socket.to(roomId).emit('receive-group-message', {
            id: uuidv4(),
            sender: 'them',
            type: 'system',
            systemMessageType: 'user-joined',
            text: `${senderInfo.name} has joined the voice room.`,
            senderSocketId: socket.id,
            senderInfo: {
                name: senderInfo.name,
                userId: senderInfo.userId,
                avatar: senderInfo.profilePhoto,
            },
            time,
        });

        // Notify the user themselves
        socket.emit('receive-group-message', {
            id: uuidv4(),
            sender: 'them',
            type: 'system',
            systemMessageType: 'you-joined',
            text: `You are in the voice room.`,
            senderSocketId: socket.id,
            senderInfo: {
                name: senderInfo.name,
                userId: senderInfo.userId,
                avatar: senderInfo.profilePhoto,
            },
            time,
        });
    }

    public sendActionsInVoice(socket: Socket, data: any): void {
        const { roomId, type, senderInfo } = data;

        // Notify others
        socket.to(roomId).emit('deliver-user-actions-in-voice', {
            type,
            senderInfo: {
                ...senderInfo,
                userId: senderInfo.userId,
                emoji: senderInfo.emoji,
            }
        });
    }

    private sendUserLeftSystemMessage(socket: Socket, roomId: string, userId: string, name: string, broadcast = true): void {
        const messageId = uuidv4();

        const messageData = {
            sender: 'them',
            text: `${name} has left the voice room.`,
            senderSocketId: socket.id,
            id: messageId,
            type: 'system' as const,
            systemMessageType: 'user-left' as const,
            senderInfo: {
                name,
                userId,
            },
            time: new Date()
        };

        if (broadcast) {
            socket.to(roomId).emit('receive-group-message', messageData);
        } else {
            socket.to(roomId).emit('receive-group-message', messageData);
        }
    }
}
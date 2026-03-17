import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { Message } from 'src/types/chat.type';
import { UserType } from 'src/types/user.type';
import type { ParticipantData, UserData } from '../types/socket.type';
import logger from '../utils/logger';

// ─── Extra types ──────────────────────────────────────────────────────────────

type BlockedMics = Map<string, Set<string>>; // roomId → Set<socketId>

// ─────────────────────────────────────────────────────────────────────────────

export class VoiceRoomManager {
    private io: Server;
    private voiceRooms = new Map<string, Set<string>>();   // roomId  → socketIds
    private usersRooms = new Map<string, string>();         // socketId → roomId
    private usersData = new Map<string, UserData>();       // socketId → UserData
    private screenSharers = new Map<string, string>();         // roomId  → sharerSocketId
    private blockedMics: BlockedMics = new Map();             // roomId  → Set<socketId>

    constructor(io: Server) {
        this.io = io;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Join / Leave
    // ══════════════════════════════════════════════════════════════════════════

    public handleJoinVoiceRoom(socket: Socket, data: UserData): void {
        const { roomId, userId, name, ...rest } = data;
        try {
            this.usersData.set(socket.id, { roomId, userId, name, ...rest });

            const previousRoomId = this.leavePreviousRoom(socket);
            this.joinRoom(socket, roomId);

            const participants = this.getRoomParticipants(roomId, socket.id);
            this.sendExistingParticipants(socket, roomId, participants);

            // Tell the joiner who is currently screen-sharing (if anyone)
            const currentSharer = this.screenSharers.get(roomId);
            if (currentSharer && currentSharer !== socket.id) {
                // 'screen-share-active' triggers handleScreenShareActive on the client
                // which then emits 'request-screen-share' back to get a fresh WebRTC offer
                socket.emit('screen-share-active', { sharerSocketId: currentSharer, roomId });
            }

            this.broadcastUserJoined(socket, roomId, previousRoomId, {
                userId,
                name,
                isLocal: false,
                ...rest,
            });
            this.sendSystemMessages(socket, roomId, {
                userId,
                name,
                profilePhoto: data.profilePhoto,
            });
        } catch (err) {
            logger.error('❌ handleJoinVoiceRoom:', err);
            socket.emit('join-error', { error: 'Failed to join voice room' });
        }
    }

    public handleLeaveVoiceRoom(
        socket: Socket,
        data: { roomId: string; userId: string; name: string }
    ): void {
        const { roomId, userId, name } = data;
        const userInfo = this.usersData.get(socket.id);
        logger.info(`🚪 ${userInfo?.name ?? name} (${socket.id}) leaving ${roomId}`);

        this.clearScreenShare(socket, roomId); // stop share on manual leave
        this.leaveRoom(socket, roomId);
        this.removeUserData(socket.id);
        this.broadcastUserLeft(socket, roomId, userId, userInfo?.name ?? name);
        this.sendUserLeftSystemMessage(socket, roomId, userId, name);
    }

    public handleDisconnect(socket: Socket): void {
        const userInfo = this.usersData.get(socket.id);
        const roomId = this.usersRooms.get(socket.id);
        
        if (roomId) {
            this.clearScreenShare(socket, roomId);
            socket.leave(roomId);
            this.usersRooms.delete(socket.id);
            this.cleanupRoomData(roomId, socket.id);

            socket.to(roomId).emit('user-left', {
                userId: userInfo?.userId,
                socketId: socket.id,
                name: userInfo?.name,
            });

            if (userInfo) {
                this.sendUserLeftSystemMessage(socket, roomId, userInfo.userId, userInfo.name, false);
            }
        }
        this.usersData.delete(socket.id);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Screen Share
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Client emits: 'user-screen-share'
     * Payload: { roomId: string, socketId: string, isSharing: boolean }
     */
    public handleScreenShare(
        socket: Socket,
        data: { roomId: string; socketId: string; isSharing: boolean }
    ): void {
        const { roomId, isSharing } = data;

        if (!this.isUserInRoom(socket.id, roomId)) {
            socket.emit('screen-share-error', { error: 'Not in room' });
            return;
        }

        if (isSharing) {
            // Only one sharer at a time
            // const existing = this.screenSharers.get(roomId);
            // if (existing && existing !== socket.id) {
            //     socket.emit('screen-share-error', {
            //         error: 'Someone else is already sharing',
            //         sharerSocketId: existing,
            //     });
            //     return;
            // }

            this.screenSharers.set(roomId, socket.id);
            logger.info(`🖥️  ${socket.id} started screen share in ${roomId}`);

            // Tell everyone else in the room (including sender for confirmation)
            this.io.to(roomId).emit('screen-share-started', {
                sharerSocketId: socket.id,
                roomId,
            });
        } else {
            this.clearScreenShare(socket, roomId);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Host Actions
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Client emits: 'host-force-mute'
     * Payload: { roomId: string, targetSocketId: string }
     * Target can unmute themselves after receiving 'force-muted'.
     */
    public handleForceMute(
        socket: Socket,
        data: { roomId: string; targetSocketId: string, targetUserId: string, senderInfo?: Partial<UserType>, receiverInfo?: Partial<UserType> }
    ): void {
        const { roomId, targetSocketId, targetUserId, senderInfo, receiverInfo } = data;
        if (!this.verifyHostAction(socket, roomId)) return;

        logger.info(`🔇 Host ${socket.id} force-muting ${targetSocketId} in ${roomId}`);

        // Update server-side mute state so new joiners see correct state
        const targetData = this.usersData.get(targetSocketId);
        if (targetData) {
            this.usersData.set(targetSocketId, { ...targetData, isMuted: true });
        }

        // Tell the target
        this.io.to(targetSocketId).emit('force-muted', {
            bySocketId: socket.id,
            roomId,
            targetUserId,
        });

        // Tell room so UI reflects the muted state
        this.broadcastVoiceRoomMessages(socket, roomId, 'system', 'mic-force-mute', `${receiverInfo?.name} was force-muted by ${senderInfo?.name}`, senderInfo, receiverInfo);
    }

    /**
     * Client emits: 'host-block-mic'
     * Payload: { roomId: string, targetSocketId: string }
     * Target CANNOT unmute — host must call 'host-unblock-mic' to lift it.
     */
    public handleBlockMic(
        socket: Socket,
        data: { roomId: string; targetSocketId: string }
    ): void {
        const { roomId, targetSocketId } = data;
        if (!this.verifyHostAction(socket, roomId)) return;

        logger.info(`🚫 Host ${socket.id} blocking mic of ${targetSocketId} in ${roomId}`);

        if (!this.blockedMics.has(roomId)) {
            this.blockedMics.set(roomId, new Set());
        }
        this.blockedMics.get(roomId)!.add(targetSocketId);

        const targetData = this.usersData.get(targetSocketId);
        if (targetData) {
            this.usersData.set(targetSocketId, { ...targetData, isMuted: true });
        }

        this.io.to(targetSocketId).emit('mic-blocked', {
            bySocketId: socket.id,
            roomId,
        });

        this.io.to(roomId).emit('participant-muted', {
            socketId: targetSocketId,
            isMuted: true,
            micBlocked: true,
            byHost: true,
        });
    }

    /**
     * Client emits: 'host-unblock-mic'
     * Payload: { roomId: string, targetSocketId: string }
     */
    public handleUnblockMic(
        socket: Socket,
        data: { roomId: string; targetSocketId: string }
    ): void {
        const { roomId, targetSocketId } = data;
        if (!this.verifyHostAction(socket, roomId)) return;

        logger.info(`✅ Host ${socket.id} unblocking mic of ${targetSocketId} in ${roomId}`);
        this.blockedMics.get(roomId)?.delete(targetSocketId);

        this.io.to(targetSocketId).emit('mic-unblocked', { roomId });
        this.io.to(roomId).emit('participant-muted', {
            socketId: targetSocketId,
            isMuted: false,
            micBlocked: false,
            byHost: true,
        });
    }

    /**
     * Client emits: 'host-kick-user'
     * Payload: { roomId: string, targetSocketId: string }
     */
    public handleKickUser(
        socket: Socket,
        data: { roomId: string; targetSocketId: string, userId: string }
    ): void {
        const { roomId, targetSocketId, userId } = data;
        if (!this.verifyHostAction(socket, roomId)) return;

        const targetData = this.usersData.get(targetSocketId);
        logger.info(`👢 Host ${socket.id} kicking ${targetSocketId} from ${roomId}`);

        // Notify the kicked user first
        const userRoomId = `user-room:${userId}`
        this.io.to(userRoomId).emit('kicked-from-room', {
            bySocketId: socket.id,
            roomId,
        });

        // Get the target socket and force-leave the room
        const targetSocket = this.io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            this.clearScreenShare(targetSocket, roomId);
            targetSocket.leave(roomId);
        }

        this.usersRooms.delete(targetSocketId);
        this.cleanupRoomData(roomId, targetSocketId);
        this.blockedMics.get(roomId)?.delete(targetSocketId);
        this.usersData.delete(targetSocketId);

        // Tell the room
        this.io.to(roomId).emit('user-left', {
            userId,
            socketId: targetSocketId,
            name: targetData?.name,
            kicked: true,
        });

        if (targetData) {
            this.sendUserLeftSystemMessage(
                socket,
                roomId,
                targetData.userId,
                targetData.name,
                false,
                true // kicked
            );
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Misc existing public methods
    // ══════════════════════════════════════════════════════════════════════════

    public getRoomsParticipants(socket: Socket, roomIds: string[]): void {
        const result = new Map<string, ParticipantData[]>();
        roomIds?.forEach((id) => result.set(id, this.getRoomParticipants(id, socket.id)));
        socket.emit('receive-rooms-existing-participants', {
            participants: Object.fromEntries(result),
        });
    }

    public getUserData(socketId: string): UserData | undefined {
        return this.usersData.get(socketId);
    }

    public getRoomForSocket(socketId: string): string | undefined {
        return this.usersRooms.get(socketId);
    }

    public getRoomParticipants(roomId: string, excludeSocketId?: string): ParticipantData[] {
        const participants: ParticipantData[] = [];
        const socketIds = this.voiceRooms.get(roomId) ?? new Set<string>();

        Array.from(socketIds).forEach((socketId) => {
            if (socketId === excludeSocketId) return;
            const userData = this.usersData.get(socketId);
            if (userData) {
                participants.push({
                    ...userData,
                    socketId,
                    id: userData.userId,
                    isMuted: userData.isMuted,
                    isLocal: false,
                });
            }
        });

        return participants;
    }

    public isUserInRoom(socketId: string, roomId: string): boolean {
        return this.usersRooms.get(socketId) === roomId;
    }

    public sendActionsInVoice(socket: Socket, data: any): void {
        const { roomId, type, senderInfo } = data;
        socket.to(roomId).emit('deliver-user-actions-in-voice', {
            type,
            senderInfo: {
                ...senderInfo,
                userId: senderInfo.userId,
                emoji: senderInfo.emoji,
            },
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════════

    /** Stop a screen share if this socket is the current sharer */
    private clearScreenShare(socket: Socket, roomId: string): void {
        if (this.screenSharers.get(roomId) !== socket.id) return;
        this.screenSharers.delete(roomId);
        logger.info(`🖥️  ${socket.id} stopped screen share in ${roomId}`);
        this.io.to(roomId).emit('screen-share-stopped', {
            sharerSocketId: socket.id,
            roomId,
        });
    }

    /**
     * Verify the caller is the host of the room.
     * Host is stored in UserData.hostId or we compare userId against the room's
     * stored hostId.  Adjust the check below to match your UserData shape.
     */
    private verifyHostAction(socket: Socket, roomId: string): boolean {
        if (!this.isUserInRoom(socket.id, roomId)) {
            socket.emit('host-action-error', { error: 'Not in room' });
            return false;
        }
        const userData = this.usersData.get(socket.id);

        if (userData?.userType !== 'host') {
            logger.warn(`⚠️  Non-host ${socket.id} attempted host action in ${roomId}`);
            socket.emit('host-action-error', { error: 'Not the host' });
            return false;
        }
        return true;
    }

    private leavePreviousRoom(socket: Socket): string | undefined {
        const prev = this.usersRooms.get(socket.id);
        if (!prev) return undefined;

        socket.leave(prev);
        const userData = this.usersData.get(socket.id);
        if (userData) {
            socket.to(prev).emit('user-left', {
                userId: userData.userId,
                socketId: socket.id,
                name: userData.name,
            });
        }
        this.voiceRooms.get(prev)?.delete(socket.id);
        return prev;
    }

    private joinRoom(socket: Socket, roomId: string): void {
        socket.join(roomId);
        this.usersRooms.set(socket.id, roomId);
        if (!this.voiceRooms.has(roomId)) this.voiceRooms.set(roomId, new Set());
        this.voiceRooms.get(roomId)!.add(socket.id);
    }

    private leaveRoom(socket: Socket, roomId: string): void {
        socket.leave(roomId);
        this.usersRooms.delete(socket.id);
        const set = this.voiceRooms.get(roomId);
        if (set) {
            set.delete(socket.id);
            if (set.size === 0) {
                this.voiceRooms.delete(roomId);
                this.blockedMics.delete(roomId);
                this.screenSharers.delete(roomId);
            }
        }
    }

    private removeUserData(socketId: string): void {
        this.usersRooms.delete(socketId);
        this.usersData.delete(socketId);
    }

    private cleanupRoomData(roomId: string, socketId: string): void {
        const set = this.voiceRooms.get(roomId);
        if (set) {
            set.delete(socketId);
            if (set.size === 0) {
                this.voiceRooms.delete(roomId);
                this.blockedMics.delete(roomId);
                this.screenSharers.delete(roomId);
            }
        }
    }

    private sendExistingParticipants(
        socket: Socket,
        roomId: string,
        participants: ParticipantData[]
    ): void {
        socket.emit('existing-participants', { participants, roomId });
    }

    private broadcastUserJoined(
        socket: Socket,
        roomId: string,
        previousRoomId: string | undefined,
        userData: any
    ): void {
        socket.to(roomId).emit('user-joined', { ...userData, socketId: socket.id });
        this.io.emit('room-updated-with-participant', {
            joinInfo: { roomId, participant: userData },
            ...(previousRoomId && { leaveInfo: { roomId: previousRoomId, participant: userData } }),
        });
    }

    private broadcastUserLeft(
        socket: Socket,
        roomId: string,
        userId: string,
        name: string
    ): void {
        socket.to(roomId).emit('user-left', { userId, socketId: socket.id, name });
        this.io.emit('room-updated-with-participant', {
            leaveInfo: { roomId, participant: { userId, name } },
        });
    }

    private sendSystemMessages(
        socket: Socket,
        roomId: string,
        senderInfo: { userId: string; name: string; profilePhoto: string }
    ): void {
        const time = new Date();
        const base = {
            sender: 'them',
            type: 'system' as const,
            senderSocketId: socket.id,
            senderInfo: {
                name: senderInfo.name,
                userId: senderInfo.userId,
                avatar: senderInfo.profilePhoto,
            },
            time,
        };

        socket.to(roomId).emit('receive-group-message', {
            ...base,
            id: uuidv4(),
            systemMessageType: 'user-joined',
            text: `${senderInfo.name} has joined the voice room.`,
        });

        socket.emit('receive-group-message', {
            ...base,
            id: uuidv4(),
            systemMessageType: 'you-joined',
            text: 'You are in the voice room.',
        });
    }

    private sendUserLeftSystemMessage(
        socket: Socket,
        roomId: string,
        userId: string,
        name: string,
        _broadcast = true,
        kicked = false
    ): void {
        socket.to(roomId).emit('receive-group-message', {
            id: uuidv4(),
            sender: 'them',
            type: 'system' as const,
            systemMessageType: kicked ? 'user-kicked' : 'user-left',
            text: kicked
                ? `${name} was kicked from the voice room.`
                : `${name} has left the voice room.`,
            senderSocketId: socket.id,
            senderInfo: { name, userId },
            time: new Date(),
        });

        if (kicked) {
            socket.emit('receive-group-message', {
                id: uuidv4(),
                sender: 'them',
                type: 'system' as const,
                systemMessageType: kicked ? 'user-kicked' : 'user-left',
                text: `${name} was kicked from the voice room.`,
                senderSocketId: socket.id,
                senderInfo: { name, userId },
                time: new Date(),
            });
        }
    }
    private broadcastVoiceRoomMessages(
        socket: Socket,
        roomId: string,
        type: Message['type'],
        systemMessageType: Message['systemMessageType'],
        message: string,
        senderInfo?: Partial<UserType>,
        receiverInfo?: Partial<UserType>,
    ): void {
        const messageId = uuidv4();
        socket.to(roomId).emit('receive-group-message', {
            id: messageId,
            sender: 'them',
            type,
            systemMessageType,
            text: message,
            senderInfo,
            receiverInfo,
            time: new Date(),
        });
        socket.emit('receive-group-message', {
            id: messageId,
            sender: 'them',
            type,
            systemMessageType,
            text: message,
            senderInfo,
            receiverInfo,
            time: new Date(),
        });
    }
}
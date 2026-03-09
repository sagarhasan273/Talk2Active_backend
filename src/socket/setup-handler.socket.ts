import { Server } from 'socket.io';
import { ReactionMessageData } from 'src/types/chat.type';
import {
    AudioToggleData,
    DeleteGroupMessageData,
    DeleteIndividualMessageData,
    EditGroupMessageData,
    EditIndividualMessageData,
    GroupMessageData,
    IndividualMessageData,
    PrivateMessageData,
    ReactionIndividualMessageData,
    StatusSelectData,
    UserData,
    WebRTCData
} from '../types/socket.type';
import { MessageHandler } from './message-handler.socket';
import { RoomMonitorService } from './room-monitor.socket'; // New import
import { UserStatusManager } from './user-status-manager.socket';
import { VoiceRoomManager } from './voice-room-manager.socket';
import { WebRTCSignaling } from './webRTC-Signaling.socket';

export class SocketHandler {
    private io: Server;
    private voiceRoomManager: VoiceRoomManager;
    private webRTCSignaling: WebRTCSignaling;
    private messageHandler: MessageHandler;
    private userStatusManager: UserStatusManager;
    private roomMonitor: RoomMonitorService; // New property

    constructor(io: Server) {
        this.io = io;
        this.voiceRoomManager = new VoiceRoomManager(io);
        this.webRTCSignaling = new WebRTCSignaling(io);
        this.messageHandler = new MessageHandler(io);
        this.userStatusManager = new UserStatusManager(io, this.voiceRoomManager);
        this.roomMonitor = new RoomMonitorService(io, this.voiceRoomManager); // Initialize monitor

        this.setupEventHandlers(io);
    }

    private setupEventHandlers(io: Server): void {
        io.on('connection', (socket) => {
            // User notification of connection
            socket.on('join-room', ({ userId, roomIds }) => {
                const roomId = `user-room:${userId}`;

                socket.join(roomId);

                this.voiceRoomManager.getRoomsParticipants(socket, roomIds)

                // logger.info(`User ${socket.id} joined room ${roomId}`);
            });

            socket.on('leave-room', ({ userId }) => {
                const roomId = `user-room:${userId}`;

                socket.leave(roomId);

                // logger.info(`User ${socket.id} left room ${roomId}`);
            });

            // Voice Room Events
            socket.on('join-voice-room', (data: UserData) => {
                this.voiceRoomManager.handleJoinVoiceRoom(socket, data);
                // Notify monitor that room is active
                this.roomMonitor.notifyRoomActivity(data.roomId);
            });

            socket.on('leave-voice-room', (data: { roomId: string, userId: string, name: string }) => {
                this.voiceRoomManager.handleLeaveVoiceRoom(socket, data);
                // Check if room is empty after leave
                this.roomMonitor.checkRoomEmpty(data.roomId);
            });

            // WebRTC Signaling Events
            socket.on('webrtc-offer', (data: WebRTCData) => {
                this.webRTCSignaling.handleOffer(socket, data);
            });

            socket.on('webrtc-answer', (data: WebRTCData) => {
                this.webRTCSignaling.handleAnswer(socket, data);
            });

            socket.on('webrtc-ice-candidate', (data: WebRTCData) => {
                this.webRTCSignaling.handleIceCandidate(socket, data);
            });

            // Message Events
            socket.on('send-private-message', (data: PrivateMessageData) => {
                this.messageHandler.handlePrivateMessage(socket, data);
            });

            socket.on('send-edit-private-message', (data: PrivateMessageData) => {
                this.messageHandler.handlePrivateMessage(socket, data);
            });

            socket.on('listening-to-user', (data: { userId: string, listenerId: string }) => {
                this.messageHandler.handleListenToUser(data.userId, data.listenerId);
            });

            socket.on('stop-listening-to-user', (data: { userId: string }) => {
                this.messageHandler.handleStopListenToUser(data.userId);
            });

            socket.on('send-individual-message', (data: IndividualMessageData) => {
                this.messageHandler.handleIndividualMessage(socket, data);
            });

            socket.on('send-delete-individual-message', (data: DeleteIndividualMessageData) => {
                this.messageHandler.handleDeleteIndividualMessage(socket, data);
            });

            socket.on('send-edit-individual-message', (data: EditIndividualMessageData) => {
                this.messageHandler.handleEditIndividualMessage(socket, data);
            });

            socket.on('send-reaction-individual-message', (data: ReactionIndividualMessageData) => {
                this.messageHandler.handleReactionIndividualMessage(socket, data);
            });

            socket.on('receiver-read-individual-message', (data: { messageId: string }) => {
                this.messageHandler.handleReceiverReadIndividualMessage(socket, data)
            });

            socket.on('send-reaction-pop-individual-message', (data: ReactionIndividualMessageData) => {
                this.messageHandler.handleReactionPopIndividualMessage(socket, data);
            });

            socket.on('send-group-message', (data: GroupMessageData) => {
                this.messageHandler.handleGroupMessage(socket, data);
            });

            socket.on('send-edit-group-message', (data: EditGroupMessageData) => {
                this.messageHandler.handleEditGroupMessage(socket, data);
            })

            socket.on('send-delete-group-message', (data: DeleteGroupMessageData) => {
                this.messageHandler.handleDeleteGroupMessage(socket, data);
            })

            socket.on('send-reaction-group-message', (data: ReactionMessageData) => {
                this.messageHandler.handleReactionGroupMessage(socket, data);
            });

            socket.on('send-reaction-pop-group-message', (data: ReactionMessageData) => {
                this.messageHandler.handleReactionPopGroupMessage(socket, data);
            });

            // User Status Events
            socket.on('user-audio-toggle', (data: AudioToggleData) => {
                this.userStatusManager.handleAudioToggle(socket, data);
            });

            socket.on('user-status-select', (data: StatusSelectData) => {
                this.userStatusManager.handleStatusSelect(socket, data);
            });

            socket.on('send-user-actions-in-voice', (data: any) => {
                this.voiceRoomManager.sendActionsInVoice(socket, data);
            });

            socket.on('webrtc-screen-share-offer', (data) => this.webRTCSignaling.handleScreenShareOffer(socket, data));

            socket.on('webrtc-screen-share-answer', (data) => this.webRTCSignaling.handleScreenShareAnswer(socket, data));

            socket.on('webrtc-screen-share-ice', (data) => this.webRTCSignaling.handleScreenShareIce(socket, data));

            socket.on('user-screen-share', (data) => {
                this.voiceRoomManager.handleScreenShare(socket, data);
                this.roomMonitor.notifyRoomActivity(data.roomId);
            });

            socket.on('host-force-mute', (data) => this.voiceRoomManager.handleForceMute(socket, data));

            socket.on('host-block-mic', (data) => this.voiceRoomManager.handleBlockMic(socket, data));

            socket.on('host-unblock-mic', (data) => this.voiceRoomManager.handleUnblockMic(socket, data));

            socket.on('host-kick-user', (data) => this.voiceRoomManager.handleKickUser(socket, data));


            // Room activity ping (from client)
            socket.on('room-activity-ping', (data: { roomId: string }) => {
                this.roomMonitor.notifyRoomActivity(data.roomId);
            });

            // Disconnection
            socket.on('disconnect', () => {
                this.voiceRoomManager.handleDisconnect(socket);

                const roomId = this.voiceRoomManager.getRoomForSocket(socket.id);

                if (roomId) {
                    this.roomMonitor.checkRoomEmpty(roomId);
                }
            });

            // Error handling
            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });
    }

    /**
     * Get Voice Room Manager instance
     */
    public getVoiceRoomManager(): VoiceRoomManager {
        return this.voiceRoomManager;
    }

    /**
     * Get WebRTC Signaling instance
     */
    public getWebRTCSignaling(): WebRTCSignaling {
        return this.webRTCSignaling;
    }

    /**
     * Get Message Handler instance
     */
    public getMessageHandler(): MessageHandler {
        return this.messageHandler;
    }

    /**
     * Get User Status Manager instance
     */
    public getUserStatusManager(): UserStatusManager {
        return this.userStatusManager;
    }

    /**
     * Get Room Monitor instance
     */
    public getRoomMonitor(): RoomMonitorService {
        return this.roomMonitor;
    }

    /**
     * Broadcast message to all sockets in a room
     */
    public broadcastToRoom(roomId: string, event: string, data: any): void {
        this.io.to(roomId).emit(event, data);
    }

    /**
     * Send message to specific socket
     */
    public sendToSocket(socketId: string, event: string, data: any): void {
        this.io.to(socketId).emit(event, data);
    }
}

let socketHandlerInstance: SocketHandler | null = null;

// Export a factory function for easy setup
export function setupVoiceHandlers(io: Server): SocketHandler {
    if (socketHandlerInstance) {
        return socketHandlerInstance;
    }
    socketHandlerInstance = new SocketHandler(io);
    return socketHandlerInstance;
}

export function getSocketHandler(): SocketHandler {
    if (!socketHandlerInstance) {
        throw new Error("❌ SocketHandler not initialized yet");
    }
    return socketHandlerInstance;
}

// Export individual managers if needed
export {
    MessageHandler, RoomMonitorService, UserStatusManager,
    VoiceRoomManager,
    WebRTCSignaling
};


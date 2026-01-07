import { Server } from 'socket.io';
import { ReactionMessageData } from 'src/types/chat.type';
import {
    AudioToggleData,
    EditGroupMessageData,
    GroupMessageData,
    PrivateMessageData,
    StatusSelectData,
    UserData,
    WebRTCData
} from '../types/socket.type';
import { MessageHandler } from './message-handler.socket';
import { UserStatusManager } from './user-status-manager.socket';
import { VoiceRoomManager } from './voice-room-manager.socket';
import { WebRTCSignaling } from './webRTC-Signaling.socket';

export class SocketHandler {
    private io: Server;
    private voiceRoomManager: VoiceRoomManager;
    private webRTCSignaling: WebRTCSignaling;
    private messageHandler: MessageHandler;
    private userStatusManager: UserStatusManager;

    constructor(io: Server) {
        this.io = io;
        this.voiceRoomManager = new VoiceRoomManager(io);
        this.webRTCSignaling = new WebRTCSignaling(io);
        this.messageHandler = new MessageHandler(io);
        this.userStatusManager = new UserStatusManager(io, this.voiceRoomManager);

        this.setupEventHandlers(io);
    }

    private setupEventHandlers(io: Server): void {
        io.on('connection', (socket) => {
            console.log('🟢 User connected:', socket.id);

            // Voice Room Events
            socket.on('join-voice-room', (data: UserData) => {
                this.voiceRoomManager.handleJoinVoiceRoom(socket, data);
            });

            socket.on('leave-voice-room', (data: { roomId: string, userId: string, name: string }) => {
                this.voiceRoomManager.handleLeaveVoiceRoom(socket, data);
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

            socket.on('send-group-message', (data: GroupMessageData) => {
                this.messageHandler.handleGroupMessage(socket, data);
            });

            socket.on('send-edit-group-message', (data: EditGroupMessageData) => {
                this.messageHandler.handleEditGroupMessage(socket, data);
            })

            socket.on('send-delete-group-message', (data: EditGroupMessageData) => {
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

            // Disconnection
            socket.on('disconnect', () => {
                this.voiceRoomManager.handleDisconnect(socket);
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

// Export a factory function for easy setup
export function setupVoiceHandlers(io: Server): SocketHandler {
    return new SocketHandler(io);
}

// Export individual managers if needed
export {
    MessageHandler,
    UserStatusManager, VoiceRoomManager,
    WebRTCSignaling
};


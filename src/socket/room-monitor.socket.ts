// room-monitor.socket.ts
import { Server } from 'socket.io';
import { ChatService } from 'src/services/chat-service';
import logger from '../utils/logger';
import { VoiceRoomManager } from './voice-room-manager.socket';

interface RoomInactivityData {
    roomId: string;
    emptySince: Date;
    timeoutId: NodeJS.Timeout;
    warningSent: boolean;
}

export class RoomMonitorService {
    private io: Server;

    private voiceRoomManager: VoiceRoomManager;

    private chatService = new ChatService();

    private inactiveRooms: Map<string, RoomInactivityData> = new Map();

    private readonly EMPTY_TIMEOUT = 1 * 60 * 1000; // 5 minutes (300000 ms)
    private readonly WARNING_TIMEOUT = 60 * 1000; // Send warning after 4 minutes
    private readonly CHECK_INTERVAL = 30 * 1000; // Check every 60 seconds

    constructor(io: Server, voiceRoomManager: VoiceRoomManager) {
        this.io = io;
        this.voiceRoomManager = voiceRoomManager;
        this.startMonitoring();
    }

    /**
     * Start the monitoring service
     */
    private startMonitoring(): void {
        setInterval(() => {
            this.checkInactiveRooms();
        }, this.CHECK_INTERVAL);

        logger.info('🕒 Room monitoring service started');
    }

    /**
     * Check if room is empty and start/update inactivity timer
     */
    public checkRoomEmpty(roomId: string): void {
        const participants = this.voiceRoomManager.getRoomParticipants(roomId);

        if (participants.length === 0) {
            // Room is empty, start inactivity timer if not already started
            if (!this.inactiveRooms.has(roomId)) {
                this.startInactivityTimer(roomId);
                logger.info(`⏰ Room ${roomId} is empty, inactivity timer started`);
            }
        } else {
            // Room has participants, clear any existing timer
            this.clearInactivityTimer(roomId);
        }
    }

    /**
     * Notify room activity (user joined, message sent, etc.)
     */
    public notifyRoomActivity(roomId: string): void {
        // If room was marked as inactive, clear the timer
        if (this.inactiveRooms.has(roomId)) {
            const participants = this.voiceRoomManager.getRoomParticipants(roomId);
            if (participants.length > 0) {
                this.clearInactivityTimer(roomId);
                logger.info(`🔄 Room ${roomId} activity detected, timer cleared`);
            }
        }
    }

    /**
     * Start inactivity timer for a room
     */
    private startInactivityTimer(roomId: string): void {
        // Clear any existing timer first
        this.clearInactivityTimer(roomId);

        // Set warning timer
        const warningTimeoutId = setTimeout(() => {
            this.sendInactivityWarning(roomId);
        }, this.WARNING_TIMEOUT);

        // Set final deactivation timer
        const deactivateTimeoutId = setTimeout(() => {
            this.deactivateRoom(roomId);
        }, this.EMPTY_TIMEOUT);

        this.inactiveRooms.set(roomId, {
            roomId,
            emptySince: new Date(),
            timeoutId: deactivateTimeoutId,
            warningSent: false
        });

        // Also store warning timeout separately
        (deactivateTimeoutId as any).warningTimeoutId = warningTimeoutId;
    }

    /**
     * Clear inactivity timer for a room
     */
    private clearInactivityTimer(roomId: string): void {
        const roomData = this.inactiveRooms.get(roomId);
        if (roomData) {
            clearTimeout(roomData.timeoutId);
            // Clear warning timeout if exists
            if ((roomData.timeoutId as any).warningTimeoutId) {
                clearTimeout((roomData.timeoutId as any).warningTimeoutId);
            }
            this.inactiveRooms.delete(roomId);
        }
    }

    /**
     * Send warning that room will be deactivated soon
     */
    private sendInactivityWarning(roomId: string): void {
        const roomData = this.inactiveRooms.get(roomId);
        if (roomData && !roomData.warningSent) {
            // Check if room is still empty
            const participants = this.voiceRoomManager.getRoomParticipants(roomId);

            if (participants.length === 0) {
                // Send warning to room (for any listeners that might reconnect)
                this.io.to(roomId).emit('room-inactivity-warning', {
                    roomId,
                    message: 'This room will be closed in 1 minute due to inactivity',
                    timeUntilClose: 60000 // 1 minute in ms
                });

                roomData.warningSent = true;
                logger.info(`⚠️ Inactivity warning sent for room ${roomId}`);
            } else {
                // Room is no longer empty, clear timer
                this.clearInactivityTimer(roomId);
            }
        }
    }

    /**
     * Deactivate room due to inactivity
     */
    private deactivateRoom(roomId: string): void {
        // Double-check if room is still empty
        const participants = this.voiceRoomManager.getRoomParticipants(roomId);

        if (participants.length === 0) {
            logger.info(`🔴 Deactivating room ${roomId} due to inactivity`);

            // Notify any remaining connections (though there shouldn't be any)
            this.io.to(roomId).emit('room-deactivated', {
                roomId,
                reason: 'No participants for 5 minutes',
                deactivatedAt: new Date()
            });

            // Force all sockets to leave the room
            this.io.in(roomId).socketsLeave(roomId);

            // You can also call an API to update database
            this.notifyServerRoomDeactivated(roomId);

            // Remove from inactive rooms map
            this.inactiveRooms.delete(roomId);
        } else {
            // Room somehow got participants, clear timer
            this.clearInactivityTimer(roomId);
        }
    }

    /**
     * Check all inactive rooms periodically
     */
    private checkInactiveRooms(): void {
        this.inactiveRooms.forEach((roomData, roomId) => {
            const participants = this.voiceRoomManager.getRoomParticipants(roomId);

            if (participants.length > 0) {
                // Room has participants, clear timer
                this.clearInactivityTimer(roomId);
                logger.info(`✅ Room ${roomId} is no longer empty, timer cleared`);
            }
        });
    }

    /**
     * Notify server (HTTP API) that room is deactivated
     */
    private async notifyServerRoomDeactivated(roomId: string): Promise<void> {
        try {
            // You can make an HTTP call to your backend API
            // to update the room status in database
            // Example:

            await this.chatService.updateRoom({ roomId, isActive: false });

            this.io.emit('room-remove-from-list', {
                roomId,
            })

            logger.info(`📡 Server notified: Room ${roomId} deactivated`);
        } catch (error) {
            logger.error(`❌ Failed to notify server for room ${roomId}:`, error);
        }
    }

    /**
     * Get all inactive rooms
     */
    public getInactiveRooms(): string[] {
        return Array.from(this.inactiveRooms.keys());
    }

    /**
     * Get room inactivity data
     */
    public getRoomInactivityData(roomId: string): RoomInactivityData | undefined {
        return this.inactiveRooms.get(roomId);
    }

    /**
     * Manually deactivate a room
     */
    public manualDeactivateRoom(roomId: string): void {
        this.deactivateRoom(roomId);
    }
}
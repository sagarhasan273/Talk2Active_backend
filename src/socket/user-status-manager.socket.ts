import { Server, Socket } from 'socket.io';
import { AudioToggleData, StatusSelectData } from '../types/socket.type';
import { VoiceRoomManager } from './voice-room-manager.socket';

export class UserStatusManager {
    constructor(
        private io: Server,
        private voiceRoomManager: VoiceRoomManager
    ) { }

    /**
     * Handle user audio toggle (mute/unmute)
     */
    public handleAudioToggle(socket: Socket, data: AudioToggleData): void {
        const { roomId, isMuted, name } = data;

        // Get current user data
        const userData = this.voiceRoomManager.getUserData(socket.id);
        if (userData) {
            // Update user data with new mute status
            const updatedUserData = { ...userData, isMuted };

            // Store the update (you might want to add a method to VoiceRoomManager for this)
            // For now, we'll emit the event and let frontend handle state

            // Broadcast the change to all others in the room
            socket.to(roomId).emit('user-audio-toggled', {
                socketId: socket.id,
                isMuted,
                name
            });

            // Also send to self for consistency
            socket.emit('user-audio-toggled-self', {
                socketId: socket.id,
                isMuted,
                name
            });
        }
    }

    /**
     * Handle user status selection
     */
    public handleStatusSelect(socket: Socket, data: StatusSelectData): void {
        const { roomId, status, name } = data;

        // Get current user data
        const userData = this.voiceRoomManager.getUserData(socket.id);
        if (userData) {
            // Update user data with new status
            const updatedUserData = { ...userData, status };

            // Broadcast the change to all others in the room
            socket.to(roomId).emit('user-status-selected', {
                socketId: socket.id,
                status,
                name
            });

            // Also send to self for consistency
            socket.emit('user-status-selected-self', {
                socketId: socket.id,
                status,
                name
            });
        }
    }

    /**
     * Update user status in the room
     */
    public updateUserStatus(socketId: string, updates: Partial<{ isMuted: boolean; status: string }>): boolean {
        // This would need integration with VoiceRoomManager to update stored data
        // For now, we'll just return true and rely on event emissions
        return true;
    }

    /**
     * Get all users' status in a room
     */
    public getRoomStatuses(roomId: string): Array<{
        socketId: string;
        name: string;
        isMuted: boolean;
        status: string;
    }> {
        // This would need to query VoiceRoomManager for participants
        // and return their status data
        return [];
    }
}
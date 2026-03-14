import { Server, Socket } from 'socket.io';

import type { WebRTCData } from '../types/socket.type';

export class WebRTCSignaling {
    constructor(private io: Server) { }

    // ── Standard signaling ────────────────────────────────────────────────────

    public handleOffer(socket: Socket, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-offer', { ...data, sender: socket.id });
    }

    public handleAnswer(socket: Socket, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-answer', { ...data, sender: socket.id });
    }

    public handleIceCandidate(socket: Socket, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-ice-candidate', { ...data, sender: socket.id });
    }

    // ── Screen share relay ────────────────────────────────────────────────────

    public handleScreenShareOffer(socket: Socket, data: WebRTCData & { isSharing: boolean }): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-screen-share-offer', {
            ...data,
            sender: socket.id,
        });
    }

    public handleScreenShareAnswer(socket: Socket, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-screen-share-answer', {
            ...data,
            sender: socket.id,
        });
    }

    public handleScreenShareIce(socket: Socket, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('webrtc-screen-share-ice', {
            ...data,
            sender: socket.id,
        });
    }

    /**
     * Late joiner → sharer handshake.
     *
     * Flow:
     *   1. New user joins, VoiceRoomManager emits 'screen-share-active' to them
     *   2. Client calls handleScreenShareActive → emits 'request-screen-share'
     *   3. Server forwards to sharer as 'screen-share-requested-by'
     *   4. Sharer calls handleScreenShareRequestedBy → sends a fresh WebRTC offer
     */
    public handleRequestScreenShare(socket: Socket, data: { target: string }): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit('screen-share-requested-by', {
            requesterSocketId: socket.id,
        });
    }

    // ── Generic forward (keep for flexibility) ────────────────────────────────

    public forwardSignal(socket: Socket, event: string, data: WebRTCData): void {
        if (!this.validateTarget(socket, data.target)) return;
        socket.to(data.target).emit(event, { ...data, sender: socket.id });
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private validateTarget(socket: Socket, target: string): boolean {
        if (!target) {
            socket.emit('webrtc-error', { error: 'Missing target' });
            return false;
        }
        if (target === socket.id) {
            socket.emit('webrtc-error', { error: 'Cannot target self' });
            return false;
        }
        if (!this.io.sockets.sockets.has(target)) {
            socket.emit('webrtc-error', { error: 'Target not found', target });
            return false;
        }
        return true;
    }
}
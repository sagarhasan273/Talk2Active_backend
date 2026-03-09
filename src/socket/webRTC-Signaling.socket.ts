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
    //
    // Client emits 'webrtc-screen-share-offer' when it wants to relay the
    // screen-share stream as a separate peer connection to a specific peer.
    // This mirrors the same offer/answer/ice flow but tagged so the receiver
    // knows it's a screen-share track, not the mic track.
    //
    // Payload extends WebRTCData with:
    //   { target: string, offer?: RTCSessionDescriptionInit, isSharing: boolean }

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
        // Prevent a socket from targeting itself
        if (target === socket.id) {
            socket.emit('webrtc-error', { error: 'Cannot target self' });
            return false;
        }
        // Make sure the target socket actually exists
        if (!this.io.sockets.sockets.has(target)) {
            socket.emit('webrtc-error', { error: 'Target not found', target });
            return false;
        }
        return true;
    }
}
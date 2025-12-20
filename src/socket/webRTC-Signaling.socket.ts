import { Server, Socket } from 'socket.io';
import { WebRTCData } from '../types/socket.type';

export class WebRTCSignaling {
    constructor(private io: Server) { }

    /**
     * Handle WebRTC offer
     */
    public handleOffer(socket: Socket, data: WebRTCData): void {
        socket.to(data.target).emit('webrtc-offer', {
            ...data,
            sender: socket.id
        });
    }

    /**
     * Handle WebRTC answer
     */
    public handleAnswer(socket: Socket, data: WebRTCData): void {
        socket.to(data.target).emit('webrtc-answer', {
            ...data,
            sender: socket.id
        });
    }

    /**
     * Handle ICE candidate
     */
    public handleIceCandidate(socket: Socket, data: WebRTCData): void {
        socket.to(data.target).emit('webrtc-ice-candidate', {
            ...data,
            sender: socket.id
        });
    }

    /**
     * Forward any WebRTC signaling message
     */
    public forwardSignal(socket: Socket, event: string, data: WebRTCData): void {
        socket.to(data.target).emit(event, {
            ...data,
            sender: socket.id
        });
    }
}
import { Server } from 'socket.io';

interface WebRTCData {
    target: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    sender?: string;
}

interface ParticipantData {
    socketId: string;
    id: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean; // Added for state tracking
}

function setupVoiceHandlers(io: Server): void {
    // Map to store user data (including mute status) keyed by socket ID
    const userRooms = new Map<string, ParticipantData>();

    io.on('connection', (socket) => {
        socket.on('join-voice-room', (data: { roomId: string, userId: string, name: string, profilePhoto: string, isMuted: boolean }) => {
            const { roomId, userId, name, profilePhoto, isMuted } = data;

            socket.join(roomId);

            // 1. Get existing participants in the room
            const roomParticipants = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
                .filter(id => id !== socket.id)
                .map(id => userRooms.get(id))
                .filter((p): p is ParticipantData => !!p); // Filter out undefined/null

            // 2. Send existing participants to the new user
            socket.emit('existing-participants', {
                participants: roomParticipants,
                roomId
            });

            // 3. Store new user's data with initial mute status
            const newParticipantData: ParticipantData = {
                socketId: socket.id,
                id: userId,
                name,
                profilePhoto,
                isMuted: isMuted || false,
            };
            userRooms.set(socket.id, newParticipantData);

            // 4. Notify others about the new user
            socket.to(roomId).emit('user-joined', newParticipantData);
        });

        socket.on('leave-voice-room', (data: { roomId: string, userId: string }) => {
            const { roomId } = data;
            socket.to(roomId).emit('user-left', { socketId: socket.id });
            socket.leave(roomId);
            userRooms.delete(socket.id);
        });

        // Handle audio toggle broadcast (NEW)
        socket.on('user-audio-toggle', (data: { roomId: string; isMuted: boolean }) => {
            const { roomId, isMuted } = data;

            // Update the mute status in the server-side map
            const userData = userRooms.get(socket.id);
            if (userData) {
                userRooms.set(socket.id, { ...userData, isMuted });
            }

            // Broadcast the change to all others in the room
            socket.to(roomId).emit('user-audio-toggled', {
                socketId: socket.id,
                isMuted,
            });
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            // Find which rooms the user was in (if necessary) and broadcast user-left
            // For simplicity, we just delete the user data here.
            userRooms.delete(socket.id);
        });

        // WebRTC signaling events (offer, answer, ice-candidate - remain the same)
        socket.on('webrtc-offer', (data: WebRTCData) => {
            socket.to(data.target).emit('webrtc-offer', {
                ...data,
                sender: socket.id
            });
        });

        socket.on('webrtc-answer', (data: WebRTCData) => {
            socket.to(data.target).emit('webrtc-answer', {
                ...data,
                sender: socket.id
            });
        });

        socket.on('webrtc-ice-candidate', (data: WebRTCData) => {
            socket.to(data.target).emit('webrtc-ice-candidate', {
                ...data,
                sender: socket.id
            });
        });
    });
}

export default setupVoiceHandlers;
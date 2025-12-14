import { Server } from 'socket.io';
import logger from 'src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

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

interface UserData {
    roomId: string;
    userId: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean;
    status: string;
}

function setupVoiceHandlers(io: Server): void {
    const voiceRooms = new Map<string, Set<string>>();
    const usersRooms = new Map<string, string>();
    const usersData = new Map<string, UserData>();

    io.on('connection', (socket) => {
        socket.on('join-voice-room', (data: UserData) => {
            const { roomId, userId, ...userBasicInfo } = data;

            try {
                // Store user data
                usersData.set(socket.id, { roomId, userId, ...userBasicInfo });

                // Leave previous room if any
                if (usersRooms.has(socket.id)) {
                    const previousRoomId = usersRooms.get(socket.id) as string;
                    socket.leave(previousRoomId);
                    socket.to(previousRoomId).emit('user-left', {
                        userId,
                        socketId: socket.id,
                        name
                    });

                    if (voiceRooms.has(previousRoomId)) {
                        voiceRooms.get(previousRoomId)?.delete(socket.id);
                    }
                }

                // Join new room
                socket.join(roomId);
                usersRooms.set(socket.id, roomId);

                if (!voiceRooms.has(roomId)) {
                    voiceRooms.set(roomId, new Set());
                }
                voiceRooms.get(roomId)?.add(socket.id);

                // Get current participants in the room (excluding self)
                const participants: ParticipantData[] = [];

                Array.from(voiceRooms.get(roomId) || []).filter(socketId => {
                    if (socketId !== socket.id) {
                        const userData = usersData.get(socketId);
                        if (userData) {
                            participants.push({
                                ...userData,
                                socketId,
                                id: userData.userId,
                                isMuted: userData.isMuted,
                            });
                        }
                        return true;
                    }
                    return false
                });

                logger.info(`📊 Room ${roomId} now has ${participants.length + 1} participants`);


                // Send existing participants to the new user
                socket.emit('existing-participants', {
                    participants: participants,
                    roomId
                });


                // Notify others about the new user
                socket.to(roomId).emit('user-joined', {
                    userId,
                    socketId: socket.id,
                    ...userBasicInfo,
                });
            } catch (error) {
                logger.error('❌ Error joining voice room:', error);
                socket.emit('join-error', { error: 'Failed to join voice room' });
            }
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

        // Handle message broadcasting (remain the same) 
        socket.on('send-private-message', (data: { targetSocketId: string; message: string; name: string }) => {
            const { targetSocketId, message, name } = data;
            socket.to(targetSocketId).emit('receive-private-message', {
                message,
                senderSocketId: socket.id,
                name
            });
        });

        socket.on('send-group-message', (data) => {
            const { roomId } = data;
            const messageId = uuidv4();
            socket.to(roomId).emit('receive-group-message', {
                ...data,
                senderSocketId: socket.id,
                id: messageId
            });
        });


        // Handle leaving voice room
        socket.on('leave-voice-room', (data: { roomId: string, userId: string, name: string }) => {
            const { roomId, userId, name } = data;
            const userInfo = usersData.get(socket.id);

            logger.info(`🚪 User ${userInfo?.name || name} (${socket.id}) leaving room ${roomId}`);

            socket.leave(roomId);
            usersRooms.delete(socket.id);
            usersData.delete(socket.id);

            if (voiceRooms.has(roomId)) {
                voiceRooms.get(roomId)?.delete(socket.id);
                if (voiceRooms.get(roomId)?.size === 0) {
                    voiceRooms.delete(roomId);
                }
            }

            socket.to(roomId).emit('user-left', {
                userId,
                socketId: socket.id,
                name: userInfo?.name || name
            });
        });

        // Handle audio toggle broadcast (NEW)
        socket.on('user-audio-toggle', (data: { roomId: string; isMuted: boolean, name: string }) => {
            const { roomId, isMuted, name } = data;

            // Update the mute status in the server-side map
            const userData = usersData.get(socket.id);
            if (userData) {
                usersData.set(socket.id, { ...userData, isMuted });
            }

            // Broadcast the change to all others in the room
            socket.to(roomId).emit('user-audio-toggled', {
                socketId: socket.id,
                isMuted,
                name
            });
        });

        // Handle user status select (NEW)
        socket.on('user-status-select', (data: { roomId: string; status: string, name: string }) => {
            const { roomId, status, name } = data;

            // Update the mute status in the server-side map
            const userData = usersData.get(socket.id);
            if (userData) {
                usersData.set(socket.id, { ...userData, status });
            }

            // Broadcast the change to all others in the room
            socket.to(roomId).emit('user-status-select', {
                socketId: socket.id,
                status,
                name
            });
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            logger.info('🔴 User disconnected:', socket.id);

            const userInfo = usersData.get(socket.id);
            const roomId = usersRooms.get(socket.id);
            if (roomId) {
                socket.leave(roomId);
                usersRooms.delete(socket.id);

                if (voiceRooms.has(roomId)) {
                    voiceRooms.get(roomId)?.delete(socket.id);
                    if (voiceRooms.get(roomId)?.size === 0) {
                        voiceRooms.delete(roomId);
                    }
                }

                socket.to(roomId).emit('user-left', {
                    userId: userInfo?.userId,
                    socketId: socket.id,
                    name: userInfo?.name
                });
            }

            usersData.delete(socket.id);
        });
    });
}

export default setupVoiceHandlers;
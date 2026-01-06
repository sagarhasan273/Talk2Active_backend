import { Server, Socket } from 'socket.io';
import { ReactionMessageData } from 'src/types/chat.type';
import { v4 as uuidv4 } from 'uuid';
import { EditGroupMessageData, GroupMessageData, PrivateMessageData } from '../types/socket.type';

export class MessageHandler {
    constructor(private io: Server) { }

    /**
     * Handle private message sending
     */
    public handlePrivateMessage(socket: Socket, data: PrivateMessageData): void {
        const { targetSocketId } = data;
        const messageId = uuidv4();

        socket.to(targetSocketId).emit('receive-private-message', {
            ...data,
            sender: 'them',
            senderSocketId: socket.id,
            id: messageId
        });
        socket.emit('receive-private-message', {
            ...data,
            sender: 'me',
            senderSocketId: socket.id,
            id: messageId
        });
    }

    /**
     * Handle group message sending
     */
    public handleGroupMessage(socket: Socket, data: GroupMessageData): void {
        const { roomId } = data;
        const messageId = uuidv4();

        socket.to(roomId).emit('receive-group-message', {
            ...data,
            sender: 'them',
            senderSocketId: socket.id,
            id: messageId
        });
        socket.emit('receive-group-message', {
            ...data,
            sender: 'me',
            senderSocketId: socket.id,
            id: messageId
        });
    }

    public handleEditGroupMessage(socket: Socket, data: EditGroupMessageData): void {
        const { roomId, messageId } = data;

        socket.to(roomId).emit('receive-edit-group-message', {
            ...data,
            text: data?.text,
            messageId
        });
        socket.emit('receive-edit-group-message', {
            ...data,
            text: data?.text,
            messageId
        });
    }

    public handleReactionGroupMessage(socket: Socket, data: ReactionMessageData): void {
        const { roomId } = data;

        socket.to(roomId).emit('receive-reaction-group-message', {
            ...data,
        });
    }

    public handleReactionPopGroupMessage(socket: Socket, data: ReactionMessageData): void {
        const { roomId } = data;

        socket.to(roomId).emit('receive-reaction-pop-group-message', {
            ...data,
        });
    }

    /**
     * Broadcast message to room
     */
    public broadcastToRoom(socket: Socket, roomId: string, event: string, data: any): void {
        socket.to(roomId).emit(event, {
            ...data,
            senderSocketId: socket.id
        });
    }

    /**
     * Send message to specific socket
     */
    public sendToSocket(targetSocketId: string, event: string, data: any, senderSocket?: Socket): void {
        if (senderSocket) {
            senderSocket.to(targetSocketId).emit(event, data);
        } else {
            this.io.to(targetSocketId).emit(event, data);
        }
    }
}
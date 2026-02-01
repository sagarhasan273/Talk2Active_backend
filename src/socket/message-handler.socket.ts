import { Server, Socket } from 'socket.io';
import { UserMessage } from 'src/models/message.model';
import { MessageService } from 'src/services/message.service';
import { ReactionMessageData } from 'src/types/chat.type';
import logger from 'src/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { DeleteGroupMessageData, DeleteIndividualMessageData, EditGroupMessageData, EditIndividualMessageData, GroupMessageData, IndividualMessageData, JoinIndividualMessageData, LeaveIndividualMessageData, PrivateMessageData, ReactionIndividualMessageData } from '../types/socket.type';

export class MessageHandler {
    private messageService = new MessageService();

    constructor(private io: Server) { }

    /**
     * Handle individual message sending
     */
    public handleJoinIndividualMessage(socket: Socket, data: JoinIndividualMessageData): void {
        const { userId, targetUserId } = data;
        const conversationId = this.messageService.generateConversationId(userId, targetUserId);
        const roomId = `message:${conversationId}`;
        socket.join(roomId);
    }

    public handleLeaveIndividualMessage(socket: Socket, data: LeaveIndividualMessageData): void {
        const { userId, targetUserId } = data;
        const conversationId = this.messageService.generateConversationId(userId, targetUserId);
        const roomId = `message:${conversationId}`;
        socket.leave(roomId);
    }

    public async handleIndividualMessage(socket: Socket, data: IndividualMessageData): Promise<void> {
        const { targetUserInfo, text } = data;

        const conversationId = this.messageService.generateConversationId(data.senderInfo.userId, data.targetUserInfo.userId);

        const messageData: Partial<UserMessage> = {
            text,
            time: new Date(),
            isUnread: true,
            type: 'message',
            senderInfo: data.senderInfo,
            targetUserInfo: data.targetUserInfo,
            conversationId: conversationId,
            isReply: data.parentMessageId ? true : false,
            parentMessageId: data.parentMessageId,
        };

        const message = await this.messageService.saveMessage(messageData);

        const targetRoomId = `user-room:${targetUserInfo.userId}`;

        socket.to(targetRoomId).emit('receive-individual-message', {
            ...data,
            sender: 'them',
            messageId: message._id
        });

        socket.emit('receive-individual-message-self', {
            ...data,
            sender: 'me',
            messageId: message._id
        });
    }

    public async handleEditIndividualMessage(socket: Socket, data: EditIndividualMessageData): Promise<void> {
        const { messageId, targetUserInfo } = data;

        const updatedMessage = await this.messageService.editMessage(messageId, data.text);

        const targetRoomId = `user-room:${targetUserInfo.userId}`;

        socket.to(targetRoomId).emit('receive-edit-individual-message', {
            ...data,
            text: data?.text,
            messageId: updatedMessage?._id
        });
        socket.emit('receive-edit-individual-message-self', {
            ...data,
            text: data?.text,
            messageId: updatedMessage?._id
        });
    }

    public handleDeleteIndividualMessage(socket: Socket, data: DeleteIndividualMessageData): void {
        const { userId, messageId } = data;

        socket.to(userId).emit('receive-delete-individual-message', {
            ...data,
            messageId
        });
        socket.emit('receive-delete-individual-message', {
            ...data,
            messageId
        });
    }

    public handleReactionIndividualMessage(socket: Socket, data: ReactionIndividualMessageData): void {
        const { userId } = data;

        socket.to(userId).emit('receive-reaction-individual-message', {
            ...data,
        });
    }

    public handleReactionPopIndividualMessage(socket: Socket, data: ReactionIndividualMessageData): void {
        const { userId } = data;

        socket.to(userId).emit('receive-reaction-pop-individual-message', {
            ...data,
        });
    }

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

    public handleEditPrivateMessage(socket: Socket, data: PrivateMessageData): void {
        const { targetSocketId } = data;
        const messageId = uuidv4();

        socket.to(targetSocketId).emit('receive-edit-private-message', {
            ...data,
            sender: 'them',
            senderSocketId: socket.id,
            id: messageId
        });
        socket.emit('receive-edit-private-message', {
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
        console.log(socket.rooms);
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

    public handleDeleteGroupMessage(socket: Socket, data: DeleteGroupMessageData): void {
        const { roomId, messageId } = data;

        socket.to(roomId).emit('receive-delete-group-message', {
            ...data,
            messageId
        });
        socket.emit('receive-delete-group-message', {
            ...data,
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

    public handleDisconnect(socket: Socket, data: { userId: string }): void {
        const { userId } = data;

        if (userId) {
            // Leave the room
            socket.leave(userId);
        }
        logger.info('🔴 Individual User disconnected:', socket.id);
    }
}
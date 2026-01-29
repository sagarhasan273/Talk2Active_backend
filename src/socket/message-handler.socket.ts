import { Server, Socket } from 'socket.io';
import { UserMessage } from 'src/models/message.model';
import { MessageService } from 'src/services/message.service';
import { ReactionMessageData } from 'src/types/chat.type';
import logger from 'src/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { DeleteGroupMessageData, DeleteIndividualMessageData, EditGroupMessageData, EditIndividualMessageData, GroupMessageData, IndividualMessageData, JoinIndividualMessageData, PrivateMessageData, ReactionIndividualMessageData } from '../types/socket.type';

export class MessageHandler {
    private socket!: Socket;
    private messageService = new MessageService();

    constructor(private io: Server) {
        this.io = io;
        this.io.on('connection', (socket) => {
            this.socket = socket;
        });
    }

    /**
     * Handle individual message sending
     */
    public handleJoinIndividualMessage(data: JoinIndividualMessageData): void {
        const { userId, targetUserId } = data;
        const conversationId = this.messageService.generateConversationId(userId, targetUserId);
        const roomId = `message:${conversationId}`;
        this.socket.join(roomId);
        // old message
    }

    public handleLeaveIndividualMessage(data: JoinIndividualMessageData): void {
        const { userId } = data;
        // this.socket.leave(userId);
        // console.log('User left individual room:', userId);
    }

    public async handleIndividualMessage(data: IndividualMessageData): Promise<void> {
        const { targetUserInfo, text, userId } = data;
        const messageId = uuidv4();

        const conversationId = this.messageService.generateConversationId(data.senderInfo.userId, data.targetUserInfo.userId);

        const messageData: Partial<UserMessage> = {
            text,
            sender: 'me', // This would be determined by your auth system
            time: new Date(),
            isUnread: true,
            isPrivate: data.isPrivate || false,
            type: 'message',
            senderInfo: data.senderInfo,
            targetUserInfo: data.targetUserInfo,
            conversationId: conversationId,
            isReply: data.parentMessageId ? true : false,
            parentMessageId: data.parentMessageId,
        };

        await this.messageService.saveMessage(messageData);

        const roomId = `message:${conversationId}`;

        if (this.socket.rooms.has(roomId)) {
            this.socket.to(roomId).emit('receive-individual-message', {
                ...data,
                sender: 'them',
                senderSocketId: this.socket.id,
                id: messageId
            });
        } else {
            this.socket.to(targetUserInfo.userId).emit('receive-individual-message', {
                ...data,
                sender: 'them',
                senderSocketId: this.socket.id,
                id: messageId
            });
        }

    }

    public handleEditIndividualMessage(data: EditIndividualMessageData): void {
        const { userId, messageId } = data;

        this.socket.to(userId).emit('receive-edit-individual-message', {
            ...data,
            text: data?.text,
            messageId
        });
        this.socket.emit('receive-edit-individual-message-self', {
            ...data,
            text: data?.text,
            messageId
        });
    }

    public handleDeleteIndividualMessage(data: DeleteIndividualMessageData): void {
        const { userId, messageId } = data;

        this.socket.to(userId).emit('receive-delete-individual-message', {
            ...data,
            messageId
        });
        this.socket.emit('receive-delete-individual-message', {
            ...data,
            messageId
        });
    }

    public handleReactionIndividualMessage(data: ReactionIndividualMessageData): void {
        const { userId } = data;

        this.socket.to(userId).emit('receive-reaction-individual-message', {
            ...data,
        });
    }

    public handleReactionPopIndividualMessage(data: ReactionIndividualMessageData): void {
        const { userId } = data;

        this.socket.to(userId).emit('receive-reaction-pop-individual-message', {
            ...data,
        });
    }

    /**
    * Handle private message sending
    */
    public handlePrivateMessage(data: PrivateMessageData): void {
        const { targetSocketId } = data;
        const messageId = uuidv4();

        this.socket.to(targetSocketId).emit('receive-private-message', {
            ...data,
            sender: 'them',
            senderSocketId: this.socket.id,
            id: messageId
        });
        this.socket.emit('receive-private-message', {
            ...data,
            sender: 'me',
            senderSocketId: this.socket.id,
            id: messageId
        });
    }

    public handleEditPrivateMessage(data: PrivateMessageData): void {
        const { targetSocketId } = data;
        const messageId = uuidv4();

        this.socket.to(targetSocketId).emit('receive-edit-private-message', {
            ...data,
            sender: 'them',
            senderSocketId: this.socket.id,
            id: messageId
        });
        this.socket.emit('receive-edit-private-message', {
            ...data,
            sender: 'me',
            senderSocketId: this.socket.id,
            id: messageId
        });
    }

    /**
     * Handle group message sending
     */

    public handleGroupMessage(data: GroupMessageData): void {
        const { roomId } = data;
        const messageId = uuidv4();

        this.socket.to(roomId).emit('receive-group-message', {
            ...data,
            sender: 'them',
            senderSocketId: this.socket.id,
            id: messageId
        });
        this.socket.emit('receive-group-message', {
            ...data,
            sender: 'me',
            senderSocketId: this.socket.id,
            id: messageId
        });
    }

    public handleEditGroupMessage(data: EditGroupMessageData): void {
        const { roomId, messageId } = data;

        this.socket.to(roomId).emit('receive-edit-group-message', {
            ...data,
            text: data?.text,
            messageId
        });
        this.socket.emit('receive-edit-group-message', {
            ...data,
            text: data?.text,
            messageId
        });
    }

    public handleDeleteGroupMessage(data: DeleteGroupMessageData): void {
        const { roomId, messageId } = data;

        this.socket.to(roomId).emit('receive-delete-group-message', {
            ...data,
            messageId
        });
        this.socket.emit('receive-delete-group-message', {
            ...data,
            messageId
        });
    }

    public handleReactionGroupMessage(data: ReactionMessageData): void {
        const { roomId } = data;

        this.socket.to(roomId).emit('receive-reaction-group-message', {
            ...data,
        });
    }

    public handleReactionPopGroupMessage(data: ReactionMessageData): void {
        const { roomId } = data;

        this.socket.to(roomId).emit('receive-reaction-pop-group-message', {
            ...data,
        });
    }

    /**
     * Broadcast message to room
     */
    public broadcastToRoom(roomId: string, event: string, data: any): void {
        this.socket.to(roomId).emit(event, {
            ...data,
            senderSocketId: this.socket.id
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

    public handleDisconnect(data: { userId: string }): void {
        const { userId } = data;

        if (userId) {
            // Leave the room
            this.socket.leave(userId);
        }
        logger.info('🔴 Individual User disconnected:', this.socket.id);
    }
}
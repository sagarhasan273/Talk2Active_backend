import { ObjectId } from 'mongodb';
import { Server, Socket } from 'socket.io';
import { UserMessage } from 'src/models/message.model';
import { MessageService } from 'src/services/message.service';
import { ReactionMessageData } from 'src/types/chat.type';
import logger from 'src/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { DeleteGroupMessageData, DeleteIndividualMessageData, EditGroupMessageData, EditIndividualMessageData, GroupMessageData, IndividualMessageData, PrivateMessageData, ReactionIndividualMessageData } from '../types/socket.type';

export class MessageHandler {
    private messageService = new MessageService();

    private listeningTo = new Map<string, string>(); // userId -> Set of socketIds

    constructor(private io: Server) { }

    /**
     * Handle individual message sending
     */

    public async handleListenToUser(userId: string, listenerId: string): Promise<void> {
        this.listeningTo.set(userId, listenerId);
    }

    public async handleStopListenToUser(userId: string): Promise<void> {
        this.listeningTo.delete(userId);
    }

    public async handleIndividualMessage(socket: Socket, data: IndividualMessageData): Promise<void> {
        const { receiverInfo, senderInfo, text, unreadMessageIds } = data;

        const conversationId = this.messageService.generateConversationId(data.senderInfo.id as string, data.receiverInfo.id as string);

        const time = new Date();
        let isUnread = true;

        if (this.listeningTo.get(receiverInfo.id as string) === senderInfo.id) {
            isUnread = false;
        }

        const messageData: Partial<UserMessage> = {
            text,
            time: time,
            isUnread, // Mark as unread if not end-to-end
            type: 'message',
            senderInfo: new ObjectId(senderInfo.id),
            receiverInfo: new ObjectId(receiverInfo.id),
            conversationId: conversationId,
            isReply: data.isReply ? true : false,
            isEdited: data.isEdited ? true : false,
            isDeleted: false,
            parentMessage: data.parentMessage?.id ? new ObjectId(data.parentMessage.id) : undefined,
        };

        if (unreadMessageIds && unreadMessageIds.length > 0) {
            await this.messageService.updateMessages(unreadMessageIds, { isUnread: true });
        }

        const message = await this.messageService.saveMessage(messageData);

        const targetRoomId = `user-room:${receiverInfo.id}`;

        socket.to(targetRoomId).emit('receive-individual-message', {
            ...data,
            sender: 'them',
            messageId: message._id,
            time: time,
        });

        socket.emit('receive-individual-message-self', {
            ...data,
            sender: 'me',
            messageId: message._id,
            time: time,
        });
    }

    public async handleEditIndividualMessage(socket: Socket, data: EditIndividualMessageData): Promise<void> {
        const { messageId, receiverInfo } = data;

        const updatedMessage = await this.messageService.editMessage(messageId, data.text);

        const targetRoomId = `user-room:${receiverInfo.id}`;

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

    public async handleDeleteIndividualMessage(socket: Socket, data: DeleteIndividualMessageData): Promise<void> {
        const { receiverId, messageId } = data;

        await this.messageService.updateMessage(messageId, { isDeleted: true, deletedAt: new Date() });

        const targetRoomId = `user-room:${receiverId}`;

        socket.to(targetRoomId).emit('receive-delete-individual-message', {
            ...data,
            messageId
        });
        socket.emit('receive-delete-individual-message-self', {
            ...data,
            messageId
        });
    }

    public async handleReactionIndividualMessage(socket: Socket, data: ReactionIndividualMessageData): Promise<void> {
        const { receiverId, messageId } = data;

        const targetRoomId = `user-room:${receiverId}`;

        await this.messageService.updateReactions(messageId, data.reaction);

        socket.to(targetRoomId).emit('receive-reaction-individual-message', {
            ...data,
        });
    }

    public async handleReactionPopIndividualMessage(socket: Socket, data: ReactionIndividualMessageData): Promise<void> {
        const { receiverId } = data;

        await this.messageService.updateReactions(data.messageId, data.reaction);

        const targetRoomId = `user-room:${receiverId}`;

        socket.to(targetRoomId).emit('receive-reaction-pop-individual-message', {
            ...data,
        });
    }

    public async handleReceiverReadIndividualMessage(socket: Socket, data: { messageId: string }): Promise<void> {
        const { messageId, ...rest } = data;
        await this.messageService.updateMessage(messageId, rest);
    }

    /**
    * Handle private message sending
    */
    public handlePrivateMessage(socket: Socket, data: PrivateMessageData): void {
        const { receiverInfo } = data;
        const messageId = uuidv4();

        const targetUserId = `user-room:${receiverInfo.userId}`;

        socket.to(targetUserId).emit('receive-private-message', {
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
        const { receiverInfo } = data;
        const messageId = uuidv4();

        const targetUserId = `user-room:${receiverInfo.userId}`;

        socket.to(targetUserId).emit('receive-edit-private-message', {
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
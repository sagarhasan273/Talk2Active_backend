import { DataPacket_Kind } from 'livekit-server-sdk';
import mongoose from 'mongoose';
import { MessageRepository } from 'src/repositories/message.repository';
import { CreateMessageDto } from 'src/schemas/message.schema';
import { socketService } from 'src/socket';
import {
    IChatMessageDoc,
    IFrontendChatMessage,
    IFrontendReaction,
    IReaction,
    IUnreadSummary,
} from 'src/types/message.type';
import { LiveKitService } from './livekit.service';

export class MessageService {
    private liveKitService = new LiveKitService();

    public static getRoomId(userA: string, userB: string): string {
        return `chat_${[userA, userB].sort().join('_')}`;
    }

    public static formatMessage(
        doc: IChatMessageDoc | any,
        viewerUserId: string
    ): IFrontendChatMessage {
        const reactions: IFrontendReaction[] = (doc.reactions || []).map((r: IReaction) => ({
            emoji: r.emoji,
            count: (r.userIds || []).length,
            reactedBySelf: (r.userIds || []).includes(viewerUserId),
        }));

        return {
            id: doc._id.toString(),
            text: doc.text,
            isSelf: doc.isSystem ? false : String(doc.authorId) === String(viewerUserId),
            isSystem: doc.isSystem || false,
            systemType: doc.systemType,
            authorId: doc.authorId,
            authorName: doc.authorName,
            recipientId: doc.recipientId,
            editedAt: doc.editedAt,
            isRead: Boolean(doc.isRead),
            readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
            replyToId: doc.replyToId || undefined,
            reactions,
            createdAt: doc.createdAt
                ? new Date(doc.createdAt).toISOString()
                : new Date().toISOString(),
        };
    }

    public static async getHistory(
        currentUserId: string,
        targetUserId: string
    ): Promise<IFrontendChatMessage[]> {
        const roomId = this.getRoomId(currentUserId, targetUserId);
        const docs = await MessageRepository.findByRoom(roomId);
        return docs.map((doc) => this.formatMessage(doc, currentUserId));
    }

    public static async saveMessage(
        authorId: string,
        authorName: string,
        dto: CreateMessageDto
    ): Promise<IFrontendChatMessage> {
        const roomId = this.getRoomId(authorId, dto.recipientId);
        const isValidObjectId = Boolean(dto.id && mongoose.Types.ObjectId.isValid(dto.id));

        const doc = await MessageRepository.create({
            ...(isValidObjectId ? { _id: dto.id as any } : {}),
            roomId,
            authorId: dto.isSystem ? undefined : authorId,
            authorName: dto.isSystem ? undefined : dto.authorName || authorName,
            recipientId: dto.recipientId,
            text: dto.text,
            isSystem: dto.isSystem || false,
            systemType: dto.systemType,
            replyToId: dto.replyToId || undefined,
            isRead: false,
            readAt: null,
            reactions: [],
        });

        // Format for sender (isSelf: true) and for recipient (isSelf: false)
        const senderFormatted = this.formatMessage(doc, authorId);
        const recipientFormatted = this.formatMessage(doc, dto.recipientId);

        try {
            socketService.emitNewMessage(dto.recipientId, recipientFormatted as any);
        } catch (socketError) {
            console.error('Failed to dispatch global Socket message:', socketError);
        }

        return senderFormatted;
    }

    public static async editMessage(
        messageId: string,
        userId: string,
        text: string
    ): Promise<IFrontendChatMessage> {
        const doc = await MessageRepository.findById(messageId);
        if (!doc) throw new Error('NOT_FOUND');
        if (String(doc.authorId) !== String(userId)) throw new Error('FORBIDDEN');

        const updated = await MessageRepository.updateText(messageId, userId, text);
        const senderFormatted = this.formatMessage(updated, userId);
        const recipientFormatted = this.formatMessage(updated, doc.recipientId);

        try {
            socketService.emitMessageEdited(doc.recipientId, recipientFormatted as any);
        } catch (socketError) {
            console.error('Failed to dispatch global Socket edit message:', socketError);
        }

        return senderFormatted;
    }

    public static async toggleReaction(
        messageId: string,
        userId: string,
        emoji: string
    ): Promise<IFrontendChatMessage> {
        const doc = await MessageRepository.findById(messageId);
        if (!doc) throw new Error('NOT_FOUND');

        const reactions: IReaction[] = (doc.reactions || []).map((r) => ({
            emoji: r.emoji,
            userIds: [...(r.userIds || [])],
        }));

        const targetIdx = reactions.findIndex((r) => r.emoji === emoji);

        if (targetIdx > -1) {
            const match = reactions[targetIdx];
            const hasReacted = match.userIds.includes(userId);

            if (hasReacted) {
                match.userIds = match.userIds.filter((id) => id !== userId);
            } else {
                match.userIds.push(userId);
            }

            if (match.userIds.length === 0) {
                reactions.splice(targetIdx, 1);
            } else {
                reactions[targetIdx] = match;
            }
        } else {
            reactions.push({ emoji, userIds: [userId] });
        }

        const updated = await MessageRepository.updateReactions(messageId, reactions);

        // Format for the user who clicked
        const formattedForCaller = this.formatMessage(updated, userId);

        // Determine the other participant in the 1-on-1 chat to notify via Socket
        const otherParticipantId =
            String(userId) === String(doc.authorId) ? doc.recipientId : doc.authorId;

        if (otherParticipantId) {
            const formattedForOther = this.formatMessage(updated, otherParticipantId);
            try {
                socketService.emitReactionToggled(otherParticipantId, {
                    messageId,
                    reactions: formattedForOther.reactions || [],
                });
            } catch (socketError) {
                console.error('Failed to dispatch global Socket reaction:', socketError);
            }
        }

        return formattedForCaller;
    }

    public static async markAsRead(currentUserId: string, targetUserId: string): Promise<void> {
        // currentUserId is the recipient reading messages sent by targetUserId (the author)
        await MessageRepository.markMessagesAsRead(currentUserId, targetUserId);

        try {
            socketService.emitMessagesRead(targetUserId, currentUserId);
        } catch (err) {
            console.error('Failed to dispatch message read event:', err);
        }
    }

    public async sendSystemMessage(
        roomName: string,
        text: string,
        systemType: 'info' | 'success' | 'warning' | 'error' = 'info',
        destinationIdentities?: string[]
    ): Promise<void> {
        const roomService = this.liveKitService.getRoomServiceClient();

        try {
            await roomService.createRoom({
                name: roomName,
                emptyTimeout: 10 * 60,
            });
        } catch {
            // Room already exists or active
        }

        const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        const systemMessagePayload = {
            type: 'CHAT_MESSAGE',
            message: {
                id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                authorId: 'system',
                authorName: 'System',
                text,
                timestamp,
                isSystem: true,
                systemType,
                isSelf: false,
            },
        };

        const data = new TextEncoder().encode(JSON.stringify(systemMessagePayload));

        try {
            await roomService.sendData(roomName, data, DataPacket_Kind.RELIABLE, {
                topic: 'room_chat',
                destinationIdentities: destinationIdentities ?? [],
            });
        } catch (error: any) {
            if (error?.status === 404 || error?.code === 'not_found') {
                console.warn(
                    `[LiveKit] Room "${roomName}" does not exist or has no active participants. Message skipped.`
                );
                return;
            }
            console.error('[LiveKit] sendSystemMessage error:', error);
            throw error;
        }
    }

    public static async getUnreadSummary(currentUserId: string): Promise<IUnreadSummary> {
        const rows = await MessageRepository.getUnreadCountsBySender(currentUserId);

        const unreadBySender: Record<string, number> = {};
        let unreadFriendsCount = 0;
        let totalUnreadMessages = 0;

        for (const row of rows) {
            if (row._id && row.count > 0) {
                unreadBySender[row._id] = row.count;
                unreadFriendsCount += 1;
                totalUnreadMessages += row.count;
            }
        }

        return {
            unreadBySender,
            unreadFriendsCount,
            totalUnreadMessages,
        };
    }
}
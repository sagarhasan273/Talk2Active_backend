import { MessageRepository } from 'src/repositories/message.repository';
import { CreateMessageDto } from 'src/schemas/message.schema';
import {
    emitMessageEdited,
    emitNewMessage,
    emitReactionToggled,
} from 'src/socket';

import {
    IChatMessageDoc,
    IFrontendChatMessage,
    IFrontendReaction,
    IReaction,
} from 'src/types/message.type';

export class MessageService {
    public static getRoomId(userA: string, userB: string): string {
        return `chat_${[userA, userB].sort().join('_')}`;
    }

    public static formatMessage(
        doc: IChatMessageDoc | any,
        currentUserId: string
    ): IFrontendChatMessage {
        const reactions: IFrontendReaction[] = (doc.reactions || []).map((r: IReaction) => ({
            emoji: r.emoji,
            count: r.userIds.length,
            reactedBySelf: r.userIds.includes(currentUserId),
        }));

        return {
            id: doc._id.toString(),
            text: doc.text,
            isSelf: doc.isSystem ? false : doc.authorId === currentUserId,
            isSystem: doc.isSystem || false,
            systemType: doc.systemType,
            authorId: doc.authorId,
            authorName: doc.authorName,
            editedAt: doc.editedAt,
            replyToId: doc.replyToId || undefined,
            reactions,
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        };
    }

    public static async getHistory(currentUserId: string, targetUserId: string): Promise<IFrontendChatMessage[]> {
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

        const doc = await MessageRepository.create({
            ...(dto.id ? { _id: dto.id as any } : {}),
            roomId,
            authorId: dto.isSystem ? undefined : authorId,
            authorName: dto.isSystem ? undefined : authorName,
            recipientId: dto.recipientId,
            text: dto.text,
            isSystem: dto.isSystem || false,
            systemType: dto.systemType,
            replyToId: dto.replyToId,
            reactions: [],
        });

        const formattedMessage = this.formatMessage(doc, authorId);

        // SOCKET.IO GLOBAL DISPATCH: Send data directly to the recipient's personal room
        try {
            emitNewMessage(dto.recipientId, formattedMessage as any);
        } catch (socketError) {
            console.error('Failed to dispatch global Socket message:', socketError);
        }

        return formattedMessage;
    }

    public static async editMessage(messageId: string, userId: string, text: string): Promise<IFrontendChatMessage> {
        const doc = await MessageRepository.findById(messageId);
        if (!doc) throw new Error('NOT_FOUND');
        if (doc.authorId !== userId) throw new Error('FORBIDDEN');

        const updated = await MessageRepository.updateText(messageId, userId, text);
        const formattedMessage = this.formatMessage(updated, userId);

        // Broadcast edit to recipient via Socket.io
        try {
            emitMessageEdited(doc.recipientId, formattedMessage as any);
        } catch (socketError) {
            console.error('Failed to dispatch global Socket edit message:', socketError);
        }

        return formattedMessage;
    }

    public static async toggleReaction(
        messageId: string,
        userId: string,
        emoji: string
    ): Promise<IFrontendChatMessage> {
        const doc = await MessageRepository.findById(messageId);
        if (!doc) throw new Error('NOT_FOUND');

        let reactions: IReaction[] = doc.reactions || [];
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
        const formattedMessage = this.formatMessage(updated, userId);

        // Broadcast reaction toggle to recipient via Socket.io
        try {
            emitReactionToggled(doc.recipientId, {
                messageId,
                reactions: formattedMessage.reactions || []
            });
        } catch (socketError) {
            console.error('Failed to dispatch global Socket reaction:', socketError);
        }

        return formattedMessage;
    }
}
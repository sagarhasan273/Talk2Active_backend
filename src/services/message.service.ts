// utils/messageUtils.ts
import { MessageModel, UserMessage } from 'src/models/message.model';
import { MessageRepository } from 'src/repositories/message.repository';
import { Message } from 'src/types/chat.type';
import { AllRelationsType } from 'src/types/social.type';

export class MessageService {
    private messageRepository = new MessageRepository();

    // Generate conversation ID between two users
    public generateConversationId(userId1: string, userId2: string): string {
        const sortedIds = [userId1, userId2].sort();
        return `conversation_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Save a new message
    public async saveMessage(messageData: Partial<UserMessage>): Promise<UserMessage> {
        return await this.messageRepository.saveMessage(messageData);
    }

    // Edit an existing message
    public async editMessage(
        messageId: Message['id'],
        newText: string
    ): Promise<UserMessage | null> {
        return await this.messageRepository.editMessage(messageId, newText);
    }

    // update message
    public async updateMessage(
        messageId: Message['id'],
        input: Partial<UserMessage>
    ): Promise<UserMessage | null> {
        return await this.messageRepository.updateMessage(messageId, input);
    }

    // Get messages between two users
    public async getMessages(
        userId1: string,
        userId2: string,
        limit: number = 20,
        before?: Date
    ): Promise<Message[]> {
        const conversationId = this.generateConversationId(userId1, userId2);

        const query: any = {
            conversationId,
            isDeleted: false,
        };

        if (before) {
            query.createdAt = { $lt: before };
        }

        const messages = await this.messageRepository.getMessages(conversationId, limit, before);

        const transformed: Message[] = messages.map(msg => ({
            id: (msg as any)._id.toString() as string,
            text: msg.text,
            time: msg.time as Date,
            isUnread: msg.isUnread,
            isDeleted: msg.isDeleted,
            isEdited: msg.isEdited,
            type: msg.type,
            conversationId: msg.conversationId,
            sender: (msg.senderInfo as any)._id.toString() === userId1 ? 'me' : 'them',
            senderInfo: msg.senderInfo && {
                userId: (msg.senderInfo as any)._id as string,
                name: (msg.senderInfo as any).name as string,
                avatar: (msg.senderInfo as any).profilePhoto as string,
            },
            receiverInfo: msg.receiverInfo && {
                userId: (msg.receiverInfo as any)._id as string,
                name: (msg.receiverInfo as any).name as string,
                avatar: (msg.receiverInfo as any).profilePhoto as string,
            },
            isReply: msg.isReply,
            parentMessage: msg.isReply ? {
                id: msg.parentMessage?._id?.toString() as string | undefined,
                text: (msg.parentMessage as any)?.text as string | undefined,
                createdAt: (msg.parentMessage as any)?.createdAt as Date | undefined,
            } : undefined,
        }));

        return transformed.reverse() as Message[];
    }

    // Mark messages as read
    public async markAsRead(
        conversationId: string,
        userId: string
    ): Promise<number> {
        const result = await MessageModel.updateMany(
            {
                conversationId,
                'senderInfo.userId': { $ne: userId }, // Messages not from this user
                isUnread: true,
            },
            {
                $set: { isUnread: false },
            }
        );

        return result.modifiedCount;
    }

    // Soft delete a message
    public async deleteMessage(
        messageId: string,
        userId: string
    ): Promise<UserMessage | null> {
        return await MessageModel.findOneAndUpdate(
            {
                _id: messageId,
                'senderInfo.userId': userId, // Only allow sender to delete
            },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    text: 'Message deleted', // Optionally clear the text
                },
            },
            { new: true }
        );
    }

    // Add reaction to a message
    public async addReaction(
        messageId: string,
        userId: string,
        emoji: string
    ): Promise<UserMessage | null> {
        return await MessageModel.findByIdAndUpdate(
            messageId,
            {
                $push: {
                    reactions: {
                        userId,
                        emoji,
                        createdAt: new Date(),
                    },
                },
            },
            { new: true }
        );
    }

    public async sortFriendsByLatestMessage(friendsList: AllRelationsType[], userId: string): Promise<any[]> {
        try {
            // Query messages to find latest for each conversation
            const conversations = await this.messageRepository.getConversationsByUserId(userId);

            // Create a map of friendId -> latest message time
            const latestMessageMap: { [key: string]: number } = {};
            const latestMessagesMap: { [key: string]: AllRelationsType['latestMessage'] } = {};

            conversations.forEach(msg => {
                const friendId = msg.senderInfo.toString() === userId ? msg.receiverInfo.toString() : msg.senderInfo.toString();
                const msgTime = new Date(msg.createdAt).getTime();

                if (!latestMessageMap[friendId] || msgTime > latestMessageMap[friendId]) {
                    latestMessageMap[friendId] = msgTime;
                    latestMessagesMap[friendId] = {
                        _id: msg._id,
                        text: msg.text,
                        createdAt: msg.createdAt,
                        time: msg.time,
                        isUnread: msg.senderInfo.toString() === userId ? false : msg.isUnread,
                    };
                }
            });

            if (friendsList.length === 1) {
                return friendsList.map(friend => {
                    const friendId = friend.accountDetails.id.toString();
                    return {
                        ...friend,
                        latestMessage: latestMessagesMap[friendId] || null,
                    };
                });
            }

            // Sort friends based on latest message time
            return friendsList.sort((a, b) => {
                const timeA = latestMessageMap[a.accountDetails.id.toString()] || 0;
                const timeB = latestMessageMap[b.accountDetails.id.toString()] || 0;
                a['latestMessage'] = latestMessagesMap[a.accountDetails.id.toString()] || null;
                b['latestMessage'] = latestMessagesMap[b.accountDetails.id.toString()] || null;
                return timeB - timeA;
            });
        } catch (error) {
            return friendsList;
        }
    }
}
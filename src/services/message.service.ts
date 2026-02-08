// utils/messageUtils.ts
import { MessageModel, UserMessage } from 'src/models/message.model';
import { MessageRepository } from 'src/repositories/message.repository';
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
        messageId: string,
        newText: string
    ): Promise<UserMessage | null> {
        return await this.messageRepository.editMessage(messageId, newText);
    }

    // Get messages between two users
    public async getMessages(
        userId1: string,
        userId2: string,
        limit: number = 20,
        before?: Date
    ): Promise<UserMessage[]> {
        const conversationId = this.generateConversationId(userId1, userId2);

        const query: any = {
            conversationId,
            isDeleted: false,
        };

        if (before) {
            query.createdAt = { $lt: before };
        }

        return await this.messageRepository.getMessages(conversationId, limit, before);
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
            // First, get all conversation IDs for these friends
            const friendIds = friendsList.map(friend => friend.accountDetails.id);

            // Query messages to find latest for each conversation
            const conversations = await this.messageRepository.getConversationsByUserId(userId);

            // Create a map of friendId -> latest message time
            const latestMessageMap: { [key: string]: number } = {};
            const latestMessagesMap: { [key: string]: AllRelationsType['latestMessage'] } = {};

            conversations.forEach(msg => {
                const friendId = msg.senderInfo.toString() === userId ? msg.targetUserInfo.toString() : msg.senderInfo.toString();
                const msgTime = new Date(msg.createdAt).getTime();

                if (!latestMessageMap[friendId] || msgTime > latestMessageMap[friendId]) {
                    latestMessageMap[friendId] = msgTime;
                    latestMessagesMap[friendId] = {
                        _id: msg._id,
                        text: msg.text,
                        createdAt: msg.createdAt,
                        time: msg.time,
                    };
                }
            });

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

    // // Update conversation last message
    // static async updateConversation(
    //     conversationId: string,
    //     lastMessage: any
    // ): Promise<void> {
    //     await Conversation.findOneAndUpdate(
    //         { _id: conversationId },
    //         {
    //             lastMessage,
    //             updatedAt: new Date(),
    //         },
    //         { upsert: true, new: true }
    //     );
    // }
}
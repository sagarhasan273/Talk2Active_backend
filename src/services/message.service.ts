// utils/messageUtils.ts
import { MessageModel, UserMessage } from 'src/models/message.model';
import { MessageRepository } from 'src/repositories/message.repository';

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
import { ObjectId } from "mongodb";
import { MessageModel, UserMessage } from "src/models/message.model";
import { Message } from "src/types/chat.type";


import { AppError } from "src/utils/errors";

export class MessageRepository {
    public async saveMessage(input: Partial<UserMessage>): Promise<UserMessage> {
        try {
            const { ...createFields } = input;

            const message = await MessageModel.create({
                ...createFields,
            });

            if (!message) {
                throw new AppError('Failed to create message', 404, 'Message Repository');
            }

            return message as unknown as UserMessage;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to create message';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    public async editMessage(
        messageId: Message['id'],
        newText: string
    ): Promise<UserMessage | null> {
        try {
            const message = await MessageModel.findOneAndUpdate(
                {
                    _id: new ObjectId(messageId)
                },
                {
                    $set: {
                        text: newText,
                        isEdited: true,
                        updatedAt: new Date(),
                    },
                },
                { new: true }
            );

            if (!message) {
                throw new AppError('Failed to update message', 404, 'Message Repository');
            }

            return message as unknown as UserMessage;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to update Message!';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    public async updateMessage(messageId: Message['id'], input: Partial<UserMessage>) {
        try {
            const message = await MessageModel.findOneAndUpdate(
                {
                    _id: new ObjectId(messageId)
                },
                {
                    $set: {
                        ...input,
                        updatedAt: new Date(),
                    },
                },
                { new: true }
            );

            if (!message) {
                throw new AppError('Failed to update message', 404, 'Message Repository');
            }

            return message as unknown as UserMessage;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to update Message!';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    public async updateMessages(messageIds: Message['id'][], input: Partial<UserMessage>): Promise<void> {
        try {
            const objectIds = messageIds.map(id => new ObjectId(id));
            await MessageModel.updateMany(
                { _id: { $in: objectIds } },
                {
                    $set: {
                        ...input,
                        updatedAt: new Date(),
                    },
                }
            );
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to update Messages!';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    public async updateReactions(messageId: Message['id'], reactionData: { userId: string; emoji: string }): Promise<UserMessage | null> {
        try {
            const message = await MessageModel.findOneAndUpdate(
                {
                    _id: new ObjectId(messageId),
                    // Check if reaction doesn't exist (for adding)
                    'reactions': {
                        $not: {
                            $elemMatch: {
                                userId: new ObjectId(reactionData.userId),
                                emoji: reactionData.emoji
                            }
                        }
                    }
                },
                {
                    $push: {
                        reactions: {
                            userId: new ObjectId(reactionData.userId),
                            emoji: reactionData.emoji
                        }
                    }
                },
                { new: true }
            );

            // If no message was updated (reaction exists), then remove it
            if (!message) {
                const updatedMessage = await MessageModel.findOneAndUpdate(
                    {
                        _id: new ObjectId(messageId),
                        'reactions': {
                            $elemMatch: {
                                userId: new ObjectId(reactionData.userId),
                                emoji: reactionData.emoji
                            }
                        }
                    },
                    {
                        $pull: {
                            reactions: {
                                userId: new ObjectId(reactionData.userId),
                                emoji: reactionData.emoji
                            }
                        }
                    },
                    { new: true }
                );

                return updatedMessage;
            }

            return message;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to update Message Reactions!';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    // Get all active rooms
    public async getMessages(conversationId: string, limit: number = 20, before?: Date): Promise<UserMessage[]> {
        try {
            const query: any = {
                conversationId,
            };

            if (before) {
                query.createdAt = { $lt: before };
            }

            const messages = await MessageModel.find(query)
                .populate('senderInfo', '_id name profilePhoto')
                .populate('receiverInfo', '_id name profilePhoto')
                .populate('parentMessage', '_id text createdAt') // Populate parent message for threading
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            return messages as unknown as UserMessage[];
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch Messages!', 500, 'Message Repository');
        }
    };

    public async deleteMessage(messageId: Message['id'], userId: string): Promise<UserMessage | null> {
        try {
            const message = await MessageModel.findOneAndUpdate(
                {
                    _id: new ObjectId(messageId),
                    senderInfo: new ObjectId(userId), // Only allow sender to delete
                },
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                    },
                },
                { new: true }
            );
            return message;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete Message!';
            throw new AppError(errorMessage, 500, 'Message Repository');
        }
    }

    public async readMessages(conversationId: string): Promise<void> {
        try {
            await MessageModel.updateMany({
                conversationId,
                isUnread: true,
            }, {
                $set: {
                    isUnread: false
                }
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to mark messages as read!', 500, 'Message Repository');
        }
    }

    public async getConversationsByUserId(userId: string): Promise<UserMessage[]> {
        try {
            const conversations = await MessageModel.find({
                $or: [
                    { "senderInfo": new ObjectId(userId) },
                    { "receiverInfo": new ObjectId(userId) }
                ],
                isDeleted: false,
            })
                // .populate('senderInfo', '_id name profilePhoto')
                // .populate('receiverInfo', '_id name profilePhoto')
                .sort({ createdAt: -1 })
                .lean();

            return conversations as unknown as UserMessage[];
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch conversations!', 500, 'Message Repository');
        }
    }
}
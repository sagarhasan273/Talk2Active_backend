import { ObjectId } from "mongodb";
import { MessageModel, UserMessage } from "src/models/message.model";


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
        messageId: string,
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

    // Get all active rooms
    public async getMessages(conversationId: string, limit: number = 20, before?: Date): Promise<UserMessage[]> {
        try {
            const query: any = {
                conversationId,
                isDeleted: false,
            };

            if (before) {
                query.createdAt = { $lt: before };
            }

            const messages = await MessageModel.find(query)
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
}
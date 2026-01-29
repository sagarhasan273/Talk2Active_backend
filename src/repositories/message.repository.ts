import { MessageModel, UserMessage } from "src/models/message.model";


import { AppError } from "src/utils/errors";

export class MessageRepository {
    public async saveMessage(input: Partial<UserMessage>): Promise<void> {
        try {
            const { ...createFields } = input;

            const message = await MessageModel.create({
                ...createFields,
            });

            if (!message) {
                throw new AppError('Failed to create message', 404, 'Message Repository');
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            console.log('Error creating message:', error);
            throw new AppError('Failed to create Message!', 500, 'Message Repository');
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
import { IMessageDocument, MessageModel } from 'src/models/message.model';
import { IReaction } from 'src/types/message.type';

export class MessageRepository {
    public static async create(payload: Partial<IMessageDocument>): Promise<IMessageDocument> {
        return MessageModel.create(payload);
    }

    public static async findById(id: string): Promise<IMessageDocument | null> {
        return MessageModel.findById(id).exec();
    }

    public static async findByRoom(roomId: string): Promise<IMessageDocument[]> {
        return MessageModel.find({ roomId }).sort({ createdAt: 1 }).exec();
    }

    public static async updateText(
        id: string,
        authorId: string,
        text: string
    ): Promise<IMessageDocument | null> {
        return MessageModel.findOneAndUpdate(
            { _id: id, authorId },
            { $set: { text, editedAt: Date.now() } },
            { new: true }
        ).exec();
    }

    public static async updateReactions(
        id: string,
        reactions: IReaction[]
    ): Promise<IMessageDocument | null> {
        return MessageModel.findByIdAndUpdate(
            id,
            { $set: { reactions } },
            { new: true }
        ).exec();
    }

    public static async markMessagesAsRead(recipientId: string, authorId: string): Promise<void> {
        await MessageModel.updateMany(
            { recipientId, authorId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        ).exec();
    }

    public static async getUnreadCountsBySender(
        recipientId: string
    ): Promise<Array<{ _id: string; count: number }>> {
        return MessageModel.aggregate([
            {
                $match: {
                    recipientId,
                    isRead: false,
                    isSystem: { $ne: true },
                    authorId: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: '$authorId',
                    count: { $sum: 1 },
                },
            },
        ]).exec();
    }
}
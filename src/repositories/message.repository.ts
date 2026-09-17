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
}
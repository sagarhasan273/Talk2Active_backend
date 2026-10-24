import mongoose from 'mongoose';
import { FeedbackModel, FeedbackReactionModel, IFeedback } from '../models/feedback.model';

export class FeedbackRepository {
    public async create(data: Partial<IFeedback>) {
        return await FeedbackModel.create(data);
    }

    public async findPaginated(skip: number, limit: number) {
        const [data, total] = await Promise.all([
            FeedbackModel.find()
                .populate('user', 'name genUserId profilePhoto')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            FeedbackModel.countDocuments(),
        ]);
        return { data, total };
    }

    public async findUserReactions(feedbackIds: string[], userId: string) {
        return await FeedbackReactionModel.find({
            feedback: { $in: feedbackIds },
            user: userId,
        }).lean();
    }

    // Handle the atomic transaction entirely within the repository layer
    public async toggleReactionTransaction(feedbackId: string, userId: string, action: 'LIKE' | 'DISLIKE') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const existingReaction = await FeedbackReactionModel.findOne({
                feedback: feedbackId,
                user: userId
            }).session(session);

            let likeInc = 0;
            let dislikeInc = 0;

            if (existingReaction) {
                if (existingReaction.action === action) {
                    // Remove reaction
                    await FeedbackReactionModel.deleteOne({ _id: existingReaction._id }).session(session);
                    if (action === 'LIKE') likeInc = -1;
                    else dislikeInc = -1;
                } else {
                    // Switch reaction
                    existingReaction.action = action;
                    await existingReaction.save({ session });
                    if (action === 'LIKE') { likeInc = 1; dislikeInc = -1; }
                    else { likeInc = -1; dislikeInc = 1; }
                }
            } else {
                // New reaction
                await FeedbackReactionModel.create([{ feedback: feedbackId, user: userId, action }], { session });
                if (action === 'LIKE') likeInc = 1;
                else dislikeInc = 1;
            }

            const updatedFeedback = await FeedbackModel.findByIdAndUpdate(
                feedbackId,
                { $inc: { likeCount: likeInc, dislikeCount: dislikeInc } },
                { new: true, session }
            ).populate('user', 'name profilePhoto').lean();

            await session.commitTransaction();

            return {
                ...updatedFeedback,
                currentUserReaction: likeInc === 1 || dislikeInc === -1 ? 'LIKE' : (dislikeInc === 1 || likeInc === -1 ? 'DISLIKE' : null)
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
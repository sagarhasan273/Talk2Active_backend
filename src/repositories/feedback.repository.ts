import mongoose from 'mongoose';
import { FeedbackModel, FeedbackReactionModel, IFeedback } from '../models/feedback.model';

export class FeedbackRepository {
  public async findById(feedbackId: string) {
    return await FeedbackModel.findById(feedbackId).lean();
  }

  public async create(data: Partial<IFeedback>) {
    return await FeedbackModel.create(data);
  }

  public async updateFeedback(feedbackId: string, updateData: Partial<any>) {
    return await FeedbackModel.findByIdAndUpdate(
      feedbackId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
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

  // Removed the transaction wrapper for local standalone MongoDB compatibility
  public async toggleReaction(feedbackId: string, userId: string, action: 'LIKE' | 'DISLIKE') {
    const existingReaction = await FeedbackReactionModel.findOne({
      feedback: feedbackId,
      user: userId
    });

    let likeInc = 0;
    let dislikeInc = 0;
    let finalUserReaction: 'LIKE' | 'DISLIKE' | null = null;

    if (existingReaction) {
      if (existingReaction.action === action) {
        // Remove reaction (Toggle off)
        await FeedbackReactionModel.deleteOne({ _id: existingReaction._id });
        if (action === 'LIKE') likeInc = -1;
        else dislikeInc = -1;
        finalUserReaction = null;
      } else {
        // Switch reaction
        existingReaction.action = action;
        await existingReaction.save();
        if (action === 'LIKE') { likeInc = 1; dislikeInc = -1; }
        else { likeInc = -1; dislikeInc = 1; }
        finalUserReaction = action;
      }
    } else {
      // New reaction
      await FeedbackReactionModel.create({ feedback: feedbackId, user: userId, action });
      if (action === 'LIKE') likeInc = 1;
      else dislikeInc = 1;
      finalUserReaction = action;
    }

    const updatedFeedback = await FeedbackModel.findByIdAndUpdate(
      feedbackId,
      { $inc: { likeCount: likeInc, dislikeCount: dislikeInc } },
      { new: true }
    ).populate('user', 'name profilePhoto').lean();

    return {
      ...updatedFeedback,
      currentUserReaction: finalUserReaction
    };
  }

  public async updateStatus(feedbackId: string, status: 'PENDING' | 'VIEWED_BY_ADMIN' | 'RESOLVED') {
    return await FeedbackModel.findByIdAndUpdate(
      feedbackId,
      { status },
      { new: true }
    ).lean();
  }

  public async deleteFeedbackTransaction(feedbackId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete the main feedback document
      const deletedFeedback = await FeedbackModel.findByIdAndDelete(feedbackId).session(session);

      // Clean up orphaned reactions in the secondary collection
      await FeedbackReactionModel.deleteMany({ feedback: feedbackId }).session(session);

      await session.commitTransaction();
      return deletedFeedback;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
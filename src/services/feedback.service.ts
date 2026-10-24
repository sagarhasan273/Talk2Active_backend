import { AppError } from 'src/utils/errors';
import { FeedbackRepository } from '../repositories/feedback.repository';

export class FeedbackService {
  private feedbackRepository = new FeedbackRepository();

  public async createFeedback(userId: string, data: any) {
    return await this.feedbackRepository.create({ ...data, user: userId });
  }

  public async getFeedbacks(page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.feedbackRepository.findPaginated(skip, limit);

    let populatedData = data as any[];

    if (currentUserId && data.length > 0) {
      const feedbackIds = data.map((fb) => fb.user.toString());
      const userReactions = await this.feedbackRepository.findUserReactions(feedbackIds, currentUserId);

      populatedData = data.map((fb) => {
        const reaction = userReactions.find((r) => r.feedback.toString() === fb.user.toString());
        return {
          ...fb,
          currentUserReaction: reaction ? reaction.action : null,
        };
      });
    }

    return {
      feedbacks: populatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async toggleReaction(feedbackId: string, userId: string, action: 'LIKE' | 'DISLIKE') {
    return await this.feedbackRepository.toggleReactionTransaction(feedbackId, userId, action);
  }

  public async updateFeedbackStatus(feedbackId: string, status: string) {
    const validStatuses = ['PENDING', 'VIEWED_BY_ADMIN', 'RESOLVED'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status value provided', 400, 'Feedback Service');
    }

    const updatedFeedback = await this.feedbackRepository.updateStatus(feedbackId, status as any);

    if (!updatedFeedback) {
      throw new AppError('Feedback not found', 404, 'Feedback Service');
    }

    return updatedFeedback;
  }

  public async deleteFeedback(feedbackId: string, userId: string) {
    const feedback = await this.feedbackRepository.findById(feedbackId);

    if (!feedback) {
      throw new AppError('Feedback not found', 404, "Feedback Service");
    }

    // Verify ownership before deleting
    if (feedback.user.toString() !== userId) {
      throw new AppError('You are not authorized to delete this feedback', 403, "Feedback Service");
    }

    return await this.feedbackRepository.deleteFeedbackTransaction(feedbackId);
  }
}
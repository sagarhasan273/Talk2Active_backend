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
            const feedbackIds = data.map((fb) => fb._id.toString());
            const userReactions = await this.feedbackRepository.findUserReactions(feedbackIds, currentUserId);

            populatedData = data.map((fb) => {
                const reaction = userReactions.find((r) => r.feedback.toString() === fb._id.toString());
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
        // Strictly delegating database operations to the repository
        return await this.feedbackRepository.toggleReactionTransaction(feedbackId, userId, action);
    }
}
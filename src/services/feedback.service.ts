import { FeedbackRepository } from '../repositories/feedback.repository';
import { AppError } from '../utils/errors';

export class FeedbackService {
    private feedbackRepository = new FeedbackRepository();

    public async createFeedback(userId: string, data: any) {
        const feedback = await this.feedbackRepository.create({
            ...data,
            user: userId,
        });
        return feedback;
    }

    public async getFeedbacks(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const { data, total } = await this.feedbackRepository.findPaginated(skip, limit);

        return {
            feedbacks: data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    public async toggleReaction(feedbackId: string, userId: string, action: 'LIKE' | 'DISLIKE') {
        const feedback = await this.feedbackRepository.findById(feedbackId);
        if (!feedback) throw new AppError('Feedback not found', 404, "Feedback Repository");

        // Remove user from both arrays to prevent duplicate voting
        feedback.likes = feedback.likes.filter((id) => id.toString() !== userId);
        feedback.dislikes = feedback.dislikes.filter((id) => id.toString() !== userId);

        // Apply new action
        if (action === 'LIKE') {
            feedback.likes.push(userId as any);
        } else if (action === 'DISLIKE') {
            feedback.dislikes.push(userId as any);
        }

        return await this.feedbackRepository.update(feedback);
    }
}
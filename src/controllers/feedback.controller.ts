import { Request, Response } from 'express';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';
import { FeedbackService } from '../services/feedback.service';

export class FeedbackController {
    private feedbackService = new FeedbackService();

    public createFeedback = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Feedback Controller');
            }
            const feedback = await this.feedbackService.createFeedback(String(userId), req.body);
            res.status(201).json({ status: true, data: feedback });
        } catch (error) {
            logger.error(error);
            this.handleError(error, res, 'failed to post feedback');
        }
    };

    public getFeedbacks = async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await this.feedbackService.getFeedbacks(page, limit);
            res.status(200).json({ status: true, data: result });
        } catch (error) {
            // ⚡ ADD THIS LINE to see the exact crash in your terminal
            logger.error('[Feedback GET Error]:', error);
            res.status(500).json({ status: false, message: 'Failed to fetch feedbacks', error });
        }
    };

    public toggleReaction = async (req: Request, res: Response) => {
        try {
            const { feedbackId } = req.params;
            const { action } = req.body;
            const userId = req.user?.userId || req.body.userId;

            const updatedFeedback = await this.feedbackService.toggleReaction(feedbackId, userId, action);
            res.status(200).json({ status: true, data: updatedFeedback });
        } catch (error) {
            res.status(500).json({ status: false, message: 'Failed to toggle reaction', error });
        }
    };

    private handleError(error: unknown, res: Response, action: string): void {
        if (error instanceof AppError) {
            logger.error(`${error.at}: ${error.message}`);
            res.status(error.statusCode).json({ message: error.message, status: false });
            return;
        }
        logger.error(`An error occurred while ${action}!`);
        res.status(500).json({ message: `An error occurred while ${action}!`, status: false });
    }

    public deleteFeedback = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.userId || req.body.userId;;

            await this.feedbackService.deleteFeedback(id, userId);

            res.status(200).json({
                status: true,
                message: 'Feedback deleted successfully'
            });
        } catch (error: any) {
            logger.error('[Feedback DELETE Error]:', error);
            res.status(error.statusCode || 500).json({
                status: false,
                message: error.message || 'Failed to delete feedback'
            });
        }
    };
}
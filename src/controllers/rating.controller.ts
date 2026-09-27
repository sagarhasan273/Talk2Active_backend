import { Request, Response } from 'express';
import { SubmitRatingSchema } from 'src/schemas/rating.schema';
import { RatingService } from 'src/services/rating.service';

export class RatingController {
    public async submitRating(req: Request, res: Response): Promise<void> {
        try {
            const raterId = req.user?.userId;
            if (!raterId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }

            // Validate request payload with Zod
            const parsedBody = SubmitRatingSchema.parse(req.body);

            const result = await RatingService.submitRating(raterId.toString(), parsedBody);

            res.status(200).json({
                success: true,
                message: result.isNew ? 'Rating submitted successfully' : 'Rating updated successfully',
                data: result,
            });
        } catch (error: any) {
            if (error?.name === 'ZodError') {
                res.status(400).json({ success: false, errors: error.errors });
                return;
            }

            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    }

    public async getUserStats(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const stats = await RatingService.getUserRatingStats(userId);

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    }
}
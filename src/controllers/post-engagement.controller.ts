import { Request, Response } from 'express';
import { CreateLikeSchema } from "src/schemas/like.schema";
import { PostEngagementService } from 'src/services/post-engagement.service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class PostEngagementController {
    private service = new PostEngagementService();

    public async likePost(req: Request, res: Response): Promise<void> {
        // Implementation for liking a post
        let validatedInput;
        try {
            validatedInput = CreateLikeSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid like create input!');
            res.status(400).json({ status: false, message: 'Invalid like create input!' });
            return;
        }

        try {
            await this.service.likePost(validatedInput);
            res.status(200).json({ status: true, message: 'Like updated successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }

            logger.error('An error occurred while updating privacy settings!');
            res.status(500).json({ message: 'An error occurred while updating privacy settings!', status: false });
        }
    }
}
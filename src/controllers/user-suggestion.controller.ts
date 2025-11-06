import { Request, Response } from 'express';
import { UserSuggestionService } from "src/services/user-suggestion.service";
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class UserSuggestionController {
    private userSuggestionService = new UserSuggestionService();

    public async getNewUsersSuggestions(req: Request, res: Response) {
        const userId = req.params.userId;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'User Controller');
            }
            const result = await this.userSuggestionService.getNewUsersSuggestions(userId, page, limit);
            res.status(200).json({ status: true, message: 'New Users suggestions fetched successfully', ...result });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching New Users suggestions!');
            res.status(500).json({ message: 'An error occurred while fetching New Users suggestions!', status: false });
        }
    }
}
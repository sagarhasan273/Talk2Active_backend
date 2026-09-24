import { Request, Response } from 'express';
import { BlockUserSchema, FollowRequestSchema } from 'src/schemas/social.schema';
import { RelationshipService } from 'src/services/social.services';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class RelationshipController {
    private relationshipService = new RelationshipService();

    // Follow a user
    async followUser(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);

            if (validatedInput.recipient === validatedInput.requester) {
                throw new AppError('You cannot follow yourself!', 400, 'Relationship Controller');
            }
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ status: false, message: error.message });
                return;
            }
            logger.error('Invalid follow user data!');
            res.status(400).json({ status: false, message: 'Invalid follow user data!' });
            return;
        }

        try {
            const result = await this.relationshipService.followUser(validatedInput);
            res.status(200).json({ status: true, message: 'User followed successfully', data: result });
        } catch (error) {
            this.handleError(error, res, 'following user');
        }
    }

    // Unfollow a user
    async unfollowUser(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);

            if (validatedInput.recipient === validatedInput.requester) {
                throw new AppError('You cannot unfollow yourself!', 400, 'Relationship Controller');
            }
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ status: false, message: error.message });
                return;
            }
            logger.error('Invalid unfollow user data!');
            res.status(400).json({ status: false, message: 'Invalid unfollow user data!' });
            return;
        }

        try {
            const result = await this.relationshipService.unfollowUser(validatedInput);
            res.status(200).json({ status: true, message: 'User unfollowed successfully', data: result });
        } catch (error) {
            this.handleError(error, res, 'unfollowing user');
        }
    }

    // Remove mutual friendship
    async removeFriend(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid remove friend data!');
            res.status(400).json({ status: false, message: 'Invalid remove friend data!' });
            return;
        }

        try {
            await this.relationshipService.removeFriend(validatedInput);
            res.status(200).json({ status: true, message: 'Friend removed successfully' });
        } catch (error) {
            this.handleError(error, res, 'removing friend');
        }
    }

    // Block a user
    async blockUser(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = BlockUserSchema.parse(req.body);

            if (validatedInput.recipient === validatedInput.requester) {
                throw new AppError('You cannot block yourself!', 400, 'Relationship Controller');
            }
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ status: false, message: error.message });
                return;
            }
            logger.error('Invalid block user data!');
            res.status(400).json({ status: false, message: 'Invalid block user data!' });
            return;
        }

        try {
            await this.relationshipService.blockUser(validatedInput);
            res.status(200).json({ status: true, message: 'User blocked successfully' });
        } catch (error) {
            this.handleError(error, res, 'blocking user');
        }
    }

    // Unblock a user
    async unblockUser(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = BlockUserSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid unblock user data!');
            res.status(400).json({ status: false, message: 'Invalid unblock user data!' });
            return;
        }

        try {
            await this.relationshipService.unblockUser(validatedInput);
            res.status(200).json({ status: true, message: 'User unblocked successfully' });
        } catch (error) {
            this.handleError(error, res, 'unblocking user');
        }
    }

    // Get followers
    async getFollowers(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Relationship Controller');
            }
            const result = await this.relationshipService.getFollowers(userId, page, limit);
            res.status(200).json({ status: true, message: 'Followers fetched successfully', ...result });
        } catch (error) {
            this.handleError(error, res, 'fetching followers');
        }
    }

    // Get following
    async getFollowing(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Relationship Controller');
            }
            const result = await this.relationshipService.getFollowing(userId, page, limit);
            res.status(200).json({ status: true, message: 'Following fetched successfully', ...result });
        } catch (error) {
            this.handleError(error, res, 'fetching following');
        }
    }

    // Get friends
    async getFriends(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Relationship Controller');
            }
            const result = await this.relationshipService.getFriends(userId, page, limit);
            res.status(200).json({ status: true, message: 'Friends fetched successfully', ...result });
        } catch (error) {
            this.handleError(error, res, 'fetching friends');
        }
    }

    // Get all relations
    async getAllRelations(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Relationship Controller');
            }
            const result = await this.relationshipService.getAllRelations(userId, page, limit);
            res.status(200).json({ status: true, message: 'All relations fetched successfully', ...result });
        } catch (error) {
            this.handleError(error, res, 'fetching all relations');
        }
    }

    // Get user stats
    async getUserStats(req: Request, res: Response): Promise<void> {
        const userId = req.params.userId;

        try {
            if (!userId) {
                throw new AppError('User ID is required', 400, 'Relationship Controller');
            }
            const result = await this.relationshipService.getUserStats(userId);
            res.status(200).json({ status: true, data: result });
        } catch (error) {
            this.handleError(error, res, 'fetching user stats');
        }
    }

    private handleError(error: unknown, res: Response, action: string): void {
        if (error instanceof AppError) {
            logger.error(`${error.at}: ${error.message}`);
            res.status(error.statusCode).json({ message: error.message, status: false });
            return;
        }
        logger.error(`An error occurred while ${action}!`);
        res.status(500).json({ message: `An error occurred while ${action}!`, status: false });
    }
}
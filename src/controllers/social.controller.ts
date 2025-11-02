import { Request, Response } from 'express';
import { FollowRequestSchema } from "src/schemas/social.schema";
import { RelationshipService } from "src/services/social.services";
import { AppError } from 'src/utils/errors';
import logger from "src/utils/logger";


export class RelationshipController {
    private relationshipService = new RelationshipService();

    async followUser(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid follow user data!');
            res.status(400).json({ status: false, message: 'Invalid follow user data!' });
            return;
        }

        try {
            await this.relationshipService.followUser(validatedInput);

            res.status(200).json({ status: true, message: 'User followed successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }

            logger.error('An error occurred while following user!');
            res.status(500).json({ message: 'An error occurred while following user!', status: false });
        }
    }

    // Unfollow a user
    async unfollowUser(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);

        } catch (error) {
            logger.error('Invalid unfollow user data!');
            res.status(400).json({ status: false, message: 'Invalid unfollow user data!' });
            return;
        }

        try {
            await this.relationshipService.unfollowUser(validatedInput);
            res.status(200).json({ status: true, message: 'User unfollowed successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while unfollowing user!');
            res.status(500).json({ message: 'An error occurred while unfollowing user!', status: false });
        }
    }

    // send friend request
    async sendFriendRequest(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);

        } catch (error) {
            logger.error('Invalid friend request user data!');
            res.status(400).json({ status: false, message: 'Invalid friend request user data!' });
            return;
        }

        try {
            await this.relationshipService.sendFriendRequest(validatedInput);

            res.status(200).json({ status: true, message: 'Friend request sent successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while sending friend request!');
            res.status(500).json({ message: 'An error occurred while sending friend request!', status: false });
        }
    }
    // accept friend request
    async acceptFriendRequest(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid accept friend request data!');
            res.status(400).json({ status: false, message: 'Invalid accept friend request data!' });
            return;
        }
        try {
            await this.relationshipService.acceptFriendRequest(validatedInput);

            res.status(200).json({ status: true, message: 'Friend request accepted successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while accepting friend request!');
            res.status(500).json({ message: 'An error occurred while accepting friend request!', status: false });
        }
    }

    // decline friend request
    async declineFriendRequest(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid decline friend request data!');
            res.status(400).json({ status: false, message: 'Invalid decline friend request data!' });
            return;
        }

        try {
            await this.relationshipService.declineFriendRequest(validatedInput);

            res.status(200).json({ status: true, message: 'Friend request declined successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while declining friend request!');
            res.status(500).json({ message: 'An error occurred while declining friend request!', status: false });
        }
    }

    // remove friend
    async removeFriend(req: Request, res: Response) {
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
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while removing friend!');
            res.status(500).json({ message: 'An error occurred while removing friend!', status: false });
        }
    }

    // block user
    async blockUser(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid block user data!');
            res.status(400).json({ status: false, message: 'Invalid block user data!' });
            return;
        }

        try {
            await this.relationshipService.blockUser(validatedInput);

            res.status(200).json({ status: true, message: 'User blocked successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while blocking user!');
            res.status(500).json({ message: 'An error occurred while blocking user!', status: false });
        }
    }

    // unblock user
    async unblockUser(req: Request, res: Response) {
        let validatedInput;
        try {
            validatedInput = FollowRequestSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid unblock user data!');
            res.status(400).json({ status: false, message: 'Invalid unblock user data!' });
            return;
        }
        try {
            await this.relationshipService.unblockUser(validatedInput);
            res.status(200).json({ status: true, message: 'User unblocked successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while unblocking user!');
            res.status(500).json({ message: 'An error occurred while unblocking user!', status: false });
        }
    }

    // get followers
    async getFollowers(req: Request, res: Response) {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            const result = await this.relationshipService.getFollowers(userId, page, limit);
            res.status(200).json({ status: true, message: 'Followers fetched successfully', data: result });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching followers!');
            res.status(500).json({ message: 'An error occurred while fetching followers!', status: false });
        }
    }

    // get following
    async getFollowing(req: Request, res: Response) {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            const result = await this.relationshipService.getFollowing(userId, page, limit);
            res.status(200).json({ status: true, message: 'Following fetched successfully', ...result });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching following!');
            res.status(500).json({ message: 'An error occurred while fetching following!', status: false });
        }
    }

    // get friends
    async getFriends(req: Request, res: Response) {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            const result = await this.relationshipService.getFriends(userId, page, limit);
            res.status(200).json({ status: true, message: 'Friends fetched successfully', ...result });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching friends!');
            res.status(500).json({ message: 'An error occurred while fetching friends!', status: false });
        }
    }

    // get all relations
    async getAllRelations(req: Request, res: Response) {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            const result = await this.relationshipService.getAllRelations(userId, page, limit);
            res.status(200).json({ status: true, message: 'All relations fetched successfully', ...result });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching all Relations!');
            res.status(500).json({ message: 'An error occurred while fetching all Relations!', status: false });
        }
    }

    // get pending requests
    async getPendingRequests(req: Request, res: Response) {
        const userId = req.params.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        try {
            const result = await this.relationshipService.getPendingRequests(userId, page, limit);
            res.status(200).json({ status: true, data: result });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching pending requests!');
            res.status(500).json({ message: 'An error occurred while fetching pending requests!', status: false });
        }
    }
    // get user stats
    async getUserStats(req: Request, res: Response) {
        const userId = req.params.userId;
        try {
            const result = await this.relationshipService.getUserStats(userId);
            res.status(200).json({ status: true, data: result });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching user stats!');
            res.status(500).json({ message: 'An error occurred while fetching user stats!', status: false });
        }
    }

    // get batch relationship status
    async getBatchRelationshipStatus(req: Request, res: Response) {
        const userId = req.params.userId;
        let targetUserIds: string[] = [];
        if (Array.isArray(req.query.targetUserIds)) {
            targetUserIds = req.query.targetUserIds as string[];
        } else if (typeof req.query.targetUserIds === 'string') {
            targetUserIds = (req.query.targetUserIds as string).split(',');
        }
        try {
            const result = await this.relationshipService.getBatchRelationshipStatus(userId, targetUserIds);
            res.status(200).json({ status: true, data: result });
        }
        catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching batch relationship status!');
            res.status(500).json({ message: 'An error occurred while fetching batch relationship status!', status: false });
        }
    }
}
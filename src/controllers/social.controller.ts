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
}
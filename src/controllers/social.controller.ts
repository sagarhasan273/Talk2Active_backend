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

}
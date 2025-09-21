import { Request, Response } from 'express';
import { CreatePostSchema, GetPostsSchemaInput } from "src/schemas/post.schema";
import { PostService } from 'src/services/post.service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class PostController {
    private service = new PostService();

    public async createPost(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = CreatePostSchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid post create data!');
            res.status(400).json({ status: false, message: 'Invalid post create data!' });
            return;
        }

        try {
            await this.service.createPost(validatedInput);
            res.status(200).json({ status: true, message: 'Post created successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }

            logger.error('An error occurred while creating post!');
            res.status(500).json({ message: 'An error occurred while creating post!', status: false });
        }
    }

    public async getPosts(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            const rawInput = req.query.input as string;
            const parsed = JSON.parse(rawInput);
            validatedInput = GetPostsSchemaInput.parse(parsed);
            if (!validatedInput.userId) {
                throw new AppError('UserId is required', 401, 'Post Controller');
            }
        } catch (error) {
            logger.error('Invalid input for posts!');
            res.status(400).json({ status: false, message: 'Invalid input for posts!' });
            return;
        }

        try {
            const posts = await this.service.getPosts(validatedInput.userId);
            res.status(200).json({ data: posts, status: true });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }
            logger.error('An error occurred while fetching posts!');
            res.status(500).json({ message: 'An error occurred while fetching posts!', status: false });
        }
    }
}
import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { CreateDislikeInput, CreateLikeInput, CreatePinpostInput } from "src/types/post-engagement.type";
import { AppError } from "src/utils/errors";


export class PostEngagementService {
    private repository = new PostEngagementRepository();

    public async likePost(input: CreateLikeInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedPost = await this.repository.likePost(input);
            return updatedPost;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update post engagement settings!', 500, 'Settings Service');
        }
    }

    public async dislikePost(input: CreateDislikeInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedPost = await this.repository.dislikePost(input);
            return updatedPost;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update post engagement settings!', 500, 'Settings Service');
        }
    }

    public async pinPost(input: CreatePinpostInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedPost = await this.repository.pinPost(input);
            return updatedPost;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update post engagement settings!', 500, 'Settings Service');
        }
    }
}
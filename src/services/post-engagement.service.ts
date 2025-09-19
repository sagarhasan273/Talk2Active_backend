import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { CreateLikeInput } from "src/types/post-engagement.type";
import { AppError } from "src/utils/errors";


export class PostEngagementService {
    private repository = new PostEngagementRepository();

    public async isLiked(postId: string, userId: string): Promise<boolean> {
        try {
            const like = await this.repository.isLiked(postId, userId);
            return !!like;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to check like status!', 500, 'Post Engagement Service');
        }
    }

    public async countLikes(postId: string): Promise<number> {
        try {
            const likeCount = await this.repository.countLikes(postId);
            return likeCount;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to count likes!', 500, 'Post Engagement Service');
        }
    }

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
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Service');
        }
    }

}
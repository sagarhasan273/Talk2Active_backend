import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { CreateLikeInput } from "src/types/like.type";
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
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Service');
        }
    }
}
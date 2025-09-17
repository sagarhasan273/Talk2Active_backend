import { LikeRepository } from "src/repositories/like.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreateLikeInput, DeleteLikeInput } from "src/types/like.type";
import { AppError } from "src/utils/errors";


export class LikeService {
    private repository = new LikeRepository();

    public async likePost(input: CreateLikeInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedSettings = await this.repository.createLike(input);
            return updatedSettings;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Service');
        }
    }


    public async deleteLike(input: DeleteLikeInput): Promise<ReturnResponseType> {
        try {
            return await this.repository.deleteLike(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update Post!', 500, 'Post Service');
        }
    }
}
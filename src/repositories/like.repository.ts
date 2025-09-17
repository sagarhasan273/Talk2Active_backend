import { ObjectId } from 'mongodb';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateLikeInput, DeleteLikeInput } from 'src/types/like.type';
import { AppError } from 'src/utils/errors';

export class LikeRepository {
    public async createLike(input: CreateLikeInput): Promise<ReturnResponseType> {
        try {
            const { ...createFields } = input;

            const post = await PostModel.create({
                ...createFields,
            });

            if (!post) {
                throw new AppError('Failed to create post', 404, 'Post Repository');
            }

            return { message: 'Privacy updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Repository');
        }
    }

    public async deleteLike(input: DeleteLikeInput): Promise<ReturnResponseType> {
        try {
            const { postId, ...updatableFields } = input;

            const user = await PostModel.updateOne(
                { _id: new ObjectId(postId) },
                {
                    $set: {
                        ...updatableFields,
                        updatedAt: new Date(),
                    },
                }
            );

            if (!user.modifiedCount) {
                throw new AppError('Failed to update post', 404, 'Post Repository');
            }

            return { message: 'Profile updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update post!', 500, 'Post Repository');
        }
    }
}

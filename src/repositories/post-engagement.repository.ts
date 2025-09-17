import { ObjectId } from 'mongodb';
import { LikeModel } from 'src/models/like.model';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateLikeInput, DeleteLikeInput } from 'src/types/like.type';
import { AppError } from 'src/utils/errors';

export class PostEngagementRepository {
    public async likePost(input: CreateLikeInput): Promise<ReturnResponseType> {
        try {
            const { postId, userId } = input;
            const postObjectId = new ObjectId(postId);
            const userObjectId = new ObjectId(userId);

            const post = await PostModel.findById(postObjectId);
            if (!post) {
                throw new AppError('Post not found', 404, 'Post Engagement Repository');
            }

            const existingLike = await LikeModel.findOneAndDelete({
                postId: postObjectId,
                userId: userObjectId,
            });

            if (existingLike) {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.likes": -1 },
                        $set: { updatedAt: new Date() }
                    }
                );
                return { message: 'Like removed successfully', status: true };
            }

            const like = await LikeModel.create({
                postId: postObjectId,
                userId: userObjectId,
            });

            if (!like) {
                throw new AppError('Failed to create like', 404, 'Post Engagement Repository');
            }

            await PostModel.updateOne(
                { _id: postObjectId },
                {
                    $inc: { "engagement.likes": 1 },
                    $set: { updatedAt: new Date() }
                }
            );

            return { message: 'Like created successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Like of Post!', 500, 'Post Engagement Repository');
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
                throw new AppError('Failed to delete post', 404, 'Post Engagement Repository');
            }

            return { message: 'Like deleted successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to delete like of post!', 500, 'Post Engagement Repository');
        }
    }
}

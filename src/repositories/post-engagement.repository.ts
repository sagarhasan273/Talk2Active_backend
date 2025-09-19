import { ObjectId } from 'mongodb';
import { LikeModel } from 'src/models/post-engagement.model';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateLikeInput, DeleteLikeInput, LikedPostsInput, LikedPostsResponseType } from 'src/types/post-engagement.type';
import { AppError } from 'src/utils/errors';

export class PostEngagementRepository {
    public async isLiked(postId: string, userId: string): Promise<boolean> {
        try {
            const like = await LikeModel.findOne({ postId: new ObjectId(postId), userId: new ObjectId(userId) });
            return !!like;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to check like status!', 500, 'Post Engagement Repository');
        }
    }

    public async countLikes(postId: string): Promise<number> {
        try {
            const likeCount = await LikeModel.countDocuments({ postId: new ObjectId(postId) });
            return likeCount;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to count likes!', 500, 'Post Engagement Repository');
        }
    }

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


    public async likedPosts(input: LikedPostsInput): Promise<LikedPostsResponseType[]> {
        try {
            const { postIds, userId } = input;

            const likedPosts = await LikeModel.find({
                postId: { $in: postIds },
                userId
            }).select("postId");

            if (!likedPosts) {
                throw new AppError('No liked posts found', 404, 'Post Engagement Repository');
            }

            return likedPosts;

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch liked posts!', 500, 'Post Engagement Repository');
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

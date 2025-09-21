import { ObjectId } from 'mongodb';
import { DislikeModel, LikeModel } from 'src/models/post-engagement.model';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreateLikeInput, DislikedPostsInput, DislikedPostsResponseType, LikedPostsInput, LikedPostsResponseType } from 'src/types/post-engagement.type';
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
            const existingDislike = await DislikeModel.findOneAndDelete({
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

            if (existingDislike) {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.dislikes": -1, "engagement.likes": 1 },
                        $set: { updatedAt: new Date() }
                    }
                );
            } else {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.likes": 1 },
                        $set: { updatedAt: new Date() }
                    }
                );
            }


            return { message: 'Like created successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Like of Post!', 500, 'Post Engagement Repository');
        }
    }

    public async dislikePost(input: CreateLikeInput): Promise<ReturnResponseType> {
        try {
            const { postId, userId } = input;
            const postObjectId = new ObjectId(postId);
            const userObjectId = new ObjectId(userId);

            const post = await PostModel.findById(postObjectId);
            if (!post) {
                throw new AppError('Post not found', 404, 'Post Engagement Repository');
            }

            const existinglike = await LikeModel.findOneAndDelete({
                postId: postObjectId,
                userId: userObjectId,
            });

            const existingDislike = await DislikeModel.findOneAndDelete({
                postId: postObjectId,
                userId: userObjectId,
            });

            if (existingDislike) {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.dislikes": -1 },
                        $set: { updatedAt: new Date() }
                    }
                );
                return { message: 'Like removed successfully', status: true };
            }


            const dislike = await DislikeModel.create({
                postId: postObjectId,
                userId: userObjectId,
            });

            if (!dislike) {
                throw new AppError('Failed to create like', 404, 'Post Engagement Repository');
            }

            if (existinglike) {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.likes": -1, "engagement.dislikes": 1 },
                        $set: { updatedAt: new Date() }
                    }
                );
            } else {
                await PostModel.updateOne(
                    { _id: postObjectId },
                    {
                        $inc: { "engagement.dislikes": 1 },
                        $set: { updatedAt: new Date() }
                    }
                );
            }


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

    public async dislikedPosts(input: DislikedPostsInput): Promise<DislikedPostsResponseType[]> {
        try {
            const { postIds, userId } = input;

            const dislikedPosts = await DislikeModel.find({
                postId: { $in: postIds },
                userId
            }).select("postId");

            if (!dislikedPosts) {
                throw new AppError('No liked posts found', 404, 'Post Engagement Repository');
            }

            return dislikedPosts;

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch liked posts!', 500, 'Post Engagement Repository');
        }
    }
}

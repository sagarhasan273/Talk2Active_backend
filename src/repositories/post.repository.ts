import { ObjectId } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreatePostInput, DeletePostInput, GetPostsByUserIdInput, PostResponseType, UpdatePostInput } from 'src/types/post.type';
import { AppError } from 'src/utils/errors';

export class PostRepository {
    public async createPost(input: CreatePostInput): Promise<ReturnResponseType> {
        try {
            const { ...createFields } = input;

            const post = await PostModel.create({
                ...createFields,
            });

            if (!post) {
                throw new AppError('Failed to create post', 404, 'Post Repository');
            }

            return { message: 'Post created successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create Post!', 500, 'Post Repository');
        }
    }

    public async updatePost(input: UpdatePostInput): Promise<ReturnResponseType> {
        try {
            const { postId, ...updatableFields } = input;

            const post = await PostModel.updateOne(
                { _id: new ObjectId(postId) },
                {
                    $set: {
                        ...updatableFields,
                        updatedAt: new Date(),
                    },
                }
            );

            if (!post.modifiedCount) {
                throw new AppError('Failed to update post', 404, 'Post Repository');
            }

            return { message: 'Post updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update post!', 500, 'Post Repository');
        }
    }

    public async deletePost(input: DeletePostInput): Promise<ReturnResponseType> {
        try {
            const { postId, author } = input;

            const deleteResult = await PostModel.deleteOne({
                _id: new ObjectId(postId),
                author: new ObjectId(author)
            });

            if (deleteResult.deletedCount === 0) {
                const postExists = await PostModel.exists({ _id: new ObjectId(postId) });

                if (!postExists) {
                    throw new AppError('Post not found', 404, 'Post Repository');
                } else {
                    throw new AppError('Unauthorized: You can only delete your own posts', 403, 'Post Repository');
                }
            }

            return { message: 'Post deleted successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to delete post!', 500, 'Post Repository');
        }
    }

    public async getPosts(): Promise<PostResponseType[]> {
        try {
            const limit = 120;

            // Using MongoDB's aggregation pipeline with $sample for random documents
            const posts = await PostModel.aggregate([
                { $match: { isDeleted: false } },
                { $sample: { size: limit } },
                {
                    $lookup: {
                        from: 'users', // or whatever your users collection is named
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorDetails'
                    }
                },
                { $unwind: { path: '$authorDetails', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        // Include all post fields
                        author: 1,
                        media: 1,
                        tags: 1,
                        engagement: 1,
                        isDeleted: 1,
                        deletedAt: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        // Only select specific fields from authorDetails
                        'authorDetails._id': 1,
                        'authorDetails.email': 1,
                        'authorDetails.username': 1,
                        'authorDetails.name': 1,
                        'authorDetails.profilePhoto': 1,
                        'authorDetails.coverPhoto': 1,
                        'authorDetails.bio': 1,
                        'authorDetails.status': 1,
                        'authorDetails.lastActive': 1,
                        'authorDetails.verified': 1,
                        'authorDetails.follower_count': 1,
                        'authorDetails.following_count': 1,
                        'authorDetails.friend_count': 1,
                        'authorDetails.accountType': 1,
                    }
                },
                { $sort: { createdAt: -1 } } // Optional: sort randomly selected posts by date
            ]);

            return posts.map((post) => ({
                ...post,
                postId: post._id.toString(),
                authorDetails: { ...(post.authorDetails ?? null), _id: undefined, id: post.authorDetails._id },
                authorRelationship: post.authorRelationship ?? null,
            })) as PostResponseType[];
        } catch (error) {
            throw new AppError('Failed to fetch posts', 500, 'Post Repository');
        }
    }

    public async getPostsByUserId(input: GetPostsByUserIdInput): Promise<PostResponseType[]> {
        try {
            const page = 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            const { userId, type } = input;

            const pipeline: PipelineStage[] = [
                {
                    $match: {
                        userId: new ObjectId(userId)
                    }
                },
                {
                    $sort: { createdAt: -1 } // Sort by most recent likes first
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: "posts",
                        localField: "postId",
                        foreignField: "_id",
                        as: "postDetails"
                    }
                },
                {
                    $unwind: "$postDetails"
                },
                {
                    $match: {
                        "postDetails.isDeleted": { $ne: true } // Exclude deleted posts
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "postDetails.author",
                        foreignField: "_id",
                        as: "authorDetails"
                    }
                },
                {
                    $unwind: "$authorDetails"
                },
                {
                    $project: {
                        _id: "$postDetails._id",
                        author: "$postDetails.author",
                        media: "$postDetails.media",
                        tags: "$postDetails.tags",
                        engagement: "$postDetails.engagement",
                        createdAt: "$postDetails.createdAt",
                        updatedAt: "$postDetails.updatedAt",
                        authorDetails: {
                            username: "$authorDetails.username",
                            name: "$authorDetails.name",
                            profilePhoto: "$authorDetails.profilePhoto",
                            verified: "$authorDetails.verified"
                        },
                        likedAt: "$createdAt" // When the user liked the post
                    }
                }
            ];

            const posts = await PostModel.find({ author: new ObjectId(userId), isDeleted: false })
                .populate('authorDetails')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return posts.map((post) => {
                const obj = post.toJSON();
                return {
                    ...obj,
                    postId: obj._id.toString(),
                    authorDetails: (obj as any).authorDetails ?? null,
                    authorRelationship: (obj as any).authorRelationship ?? null,
                } as PostResponseType;
            });
        } catch (error) {
            throw new AppError('Failed to fetch posts', 500, 'Post Repository');
        }
    }
}

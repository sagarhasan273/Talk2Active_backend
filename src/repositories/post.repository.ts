import { ObjectId } from 'mongodb';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreatePostInput, DeletePostInput, GetPostsByUserIdInput, PostType, UpdatePostInput } from 'src/types/post.type';
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

    public async getPosts(): Promise<PostType[]> {
        try {
            const skip = 0;
            const limit = 20;

            const posts = await PostModel.find({ isDeleted: false })
                .populate('authorDetails')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return posts.map((post) => {
                const obj = post.toJSON();
                return {
                    ...obj,
                    id: obj._id.toString(),
                };
            });
        } catch (error) {
            throw new AppError('Failed to fetch posts', 500, 'Post Repository');
        }
    }

    public async getPostsByUserId(input: GetPostsByUserIdInput): Promise<PostType[]> {
        try {
            const skip = 0;
            const limit = 10;

            const { userId } = input;

            const posts = await PostModel.find({ author: new ObjectId(userId), isDeleted: false })
                .populate('authorDetails')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return posts.map((post) => {
                const obj = post.toJSON();
                return {
                    ...obj,
                    id: obj._id.toString(),
                };
            });
        } catch (error) {
            throw new AppError('Failed to fetch posts', 500, 'Post Repository');
        }
    }
}

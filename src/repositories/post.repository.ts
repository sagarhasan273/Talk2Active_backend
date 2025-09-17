import { ObjectId } from 'mongodb';
import { PostModel } from 'src/models/post.model';
import { ReturnResponseType } from 'src/types/base.type';
import { CreatePostInput, PostResponseType, UpdatePostInput } from 'src/types/post.type';
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

    public async getPosts(): Promise<PostResponseType[]> {
        try {
            const posts = await PostModel.find({ isDeleted: false })
                .populate('authorDetails')
                .sort({ createdAt: -1 });

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

    public async updatePost(input: UpdatePostInput): Promise<ReturnResponseType> {
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

            return { message: 'Post updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update post!', 500, 'Post Repository');
        }
    }
}

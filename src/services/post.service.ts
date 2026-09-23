
import { PostRepository } from "src/repositories/post.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput, DeletePostInput, GetPostsByUserIdInput, GetPostsInput, PostResponseType, UpdatePostInput } from "src/types/post.type";
import { AppError } from "src/utils/errors";


export class PostService {
    private repository = new PostRepository();

    public async createPost(input: CreatePostInput): Promise<any> {
        try {
            const createdPost = await this.repository.createPost(input);
            return createdPost;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create post!', 500, 'Post Service');
        }
    }

    public async updatePost(input: UpdatePostInput): Promise<ReturnResponseType> {
        try {
            return await this.repository.updatePost(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to update Post!', 500, 'Post Service');
        }
    }

    public async deletePost(input: DeletePostInput): Promise<ReturnResponseType> {
        try {
            return await this.repository.deletePost(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError('Failed to delete Post!', 500, 'Post Service');
        }
    }


    public async getPosts(userId: GetPostsInput['userId'] | undefined): Promise<PostResponseType[]> {
        try {
            userId;
            const posts = await this.repository.getPosts();

            if (!userId) {
                return posts
            };

            return posts;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch posts', 500, 'Post Service');
        }
    }


    public async getPostsByUserId(input: GetPostsByUserIdInput): Promise<PostResponseType[]> {
        try {
            const { userId } = input;

            if (!userId) throw new AppError('User ID not found in token', 400, 'User Service');

            const posts = await this.repository.getPostsByUserId(input);

            return posts;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch posts', 500, 'Post Service');
        }
    }

}
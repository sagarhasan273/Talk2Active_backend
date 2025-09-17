import { PostRepository } from "src/repositories/post.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput, PostResponseType, UpdatePostInput } from "src/types/post.type";
import { AppError } from "src/utils/errors";


export class PostService {
    private repository = new PostRepository();

    public async createPost(input: CreatePostInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedSettings = await this.repository.createPost(input);
            return updatedSettings;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Service');
        }
    }
    public async getPosts(): Promise<PostResponseType[]> {
        try {
            const posts = await this.repository.getPosts();
            return posts;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch posts', 500, 'Post Service');
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
}
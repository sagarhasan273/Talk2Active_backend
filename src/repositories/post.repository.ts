import { PostModel } from "src/models/post.model";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput } from 'src/types/post.type';
import { AppError } from "src/utils/errors";


export class PostRepository {
    public async createPost(input: CreatePostInput): Promise<ReturnResponseType> {
        try {
            const { ...createFields } = input;

            const post = await PostModel.create(
                {
                    ...createFields,
                }
            );

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
}
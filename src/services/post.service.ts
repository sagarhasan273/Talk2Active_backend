import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { PostRepository } from "src/repositories/post.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput, PostResponseType, UpdatePostInput } from "src/types/post.type";
import { AppError } from "src/utils/errors";
import { JwtService } from "./auth/jwt.service";


export class PostService {
    private repository = new PostRepository();
    private engagementRepository = new PostEngagementRepository();

    async enhancePostsWithLikeInfo(posts: PostResponseType[], userId: string): Promise<PostResponseType[]> {
        const likedPosts = await this.engagementRepository.likedPosts({ postIds: posts.map(p => p.id), userId });
        const likedSet = new Set(likedPosts.map(l => l.postId.toString()));

        const enhancedPosts = await Promise.all(posts.map(async (post) => {
            return {
                ...post,
                isLiked: likedSet.has(post.id),
            };
        }));
        return enhancedPosts;
    }

    public async createPost(input: CreatePostInput): Promise<any> {
        try {
            const updatedPost = await this.repository.createPost(input);
            return updatedPost;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create post!', 500, 'Post Service');
        }
    }

    public async getPosts(token: string): Promise<PostResponseType[]> {
        try {
            const posts = await this.repository.getPosts();

            const decodedToken = JwtService.decodeToken(token);
            if (!decodedToken) throw new Error('Invalid token');

            const userId = decodedToken.id;
            if (!userId) throw new AppError('User ID not found in token', 400, 'User Service');

            const enhancedPosts = await this.enhancePostsWithLikeInfo(posts, userId); // Example userId
            return enhancedPosts;
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
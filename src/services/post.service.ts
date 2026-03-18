import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { PostRepository } from "src/repositories/post.repository";
import { RelationshipRepository } from "src/repositories/social.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput, DeletePostInput, GetPostsByUserIdInput, GetPostsInput, PostResponseType, UpdatePostInput } from "src/types/post.type";
import { AuthorRelationship } from "src/types/social.type";
import { AppError } from "src/utils/errors";


export class PostService {
    private repository = new PostRepository();
    private engagementRepository = new PostEngagementRepository();
    private relationshipService = new RelationshipRepository();

    async enhancePostsWithEngagementInfo(
        posts: PostResponseType[],
        userId: string
    ): Promise<PostResponseType[]> {
        const [
            likedPosts,
            dislikedPosts,
            pinPosts,
            authorRelationships,
        ] = await Promise.all([
            this.engagementRepository.likedPosts({
                postIds: posts.map(p => p.postId),
                userId
            }),
            this.engagementRepository.dislikedPosts({
                postIds: posts.map(p => p.postId),
                userId
            }),
            this.engagementRepository.pinPosts({
                postIds: posts.map(p => p.postId),
                userId
            }),
            this.getAuthorRelationships(posts, userId),
        ]);

        const likedSet = new Set(likedPosts.map(l => l.postId.toString()));
        const dislikedSet = new Set(dislikedPosts.map(d => d.postId.toString()));
        const pinSet = new Set(pinPosts.map(p => p.postId.toString()));

        const enhancedPosts = posts.map((post) => {
            const authorRelationship = authorRelationships.get(post.author.toString());

            return {
                ...post,
                isLiked: likedSet.has(post.postId.toString()),
                isDisliked: dislikedSet.has(post.postId.toString()),
                isPinned: pinSet.has(post.postId.toString()),
                authorRelationship: {
                    ...authorRelationship,
                }
            };
        });

        return enhancedPosts as any;
    }

    private async getAuthorRelationships(
        posts: PostResponseType[],
        userId: string
    ): Promise<Map<string, AuthorRelationship>> {
        const authorIds = [...new Set(posts.map(post => post.author.toString()))];

        if (authorIds.length === 0) {
            return new Map();
        }

        const batchStatus = await this.relationshipService.getBatchRelationshipStatus(
            userId,
            authorIds
        );

        const relationshipMap = new Map();
        batchStatus.statuses.forEach(status => {
            relationshipMap.set(status.targetUserId.toString(), {
                relationship: status.relationship,
                following: status.following,
                followers: status.followers,
                friends: status.friends,
                blocked: status.blocked,
                pending: status.pending
            });
        });

        return relationshipMap;
    }

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

            const enhancedPosts = await this.enhancePostsWithEngagementInfo(posts, userId.toString());

            return enhancedPosts;
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

            const enhancedPosts = await this.enhancePostsWithEngagementInfo(posts, userId.toString());
            return enhancedPosts;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch posts', 500, 'Post Service');
        }
    }

}
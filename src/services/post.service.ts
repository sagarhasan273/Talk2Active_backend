import { PostEngagementRepository } from "src/repositories/post-engagement.repository";
import { PostRepository } from "src/repositories/post.repository";
import { RelationshipRepository } from "src/repositories/social.repository";
import { ReturnResponseType } from "src/types/base.type";
import { CreatePostInput, GetPostsInput, PostResponseType, PostType, UpdatePostInput } from "src/types/post.type";
import { AuthorRelationship } from "src/types/social.type";
import { AppError } from "src/utils/errors";


export class PostService {
    private repository = new PostRepository();
    private engagementRepository = new PostEngagementRepository();
    private relationshipService = new RelationshipRepository();

    async enhancePostsWithEngagementInfo(
        posts: PostType[],
        userId: string
    ): Promise<PostResponseType[]> {
        // Get all necessary data in parallel
        const [
            likedPosts,
            dislikedPosts,
            pinPosts,
            authorRelationships,
            authorStats
        ] = await Promise.all([
            this.engagementRepository.likedPosts({
                postIds: posts.map(p => p.author),
                userId
            }),
            this.engagementRepository.dislikedPosts({
                postIds: posts.map(p => p.author),
                userId
            }),
            this.engagementRepository.pinPosts({
                postIds: posts.map(p => p.author),
                userId
            }),
            this.getAuthorRelationships(posts, userId),
            this.getAuthorStats(posts)
        ]);

        const likedSet = new Set(likedPosts.map(l => l.postId.toString()));
        const dislikedSet = new Set(dislikedPosts.map(d => d.postId.toString()));
        const pinSet = new Set(pinPosts.map(p => p.postId.toString()));

        const enhancedPosts = posts.map((post) => {
            const authorRelationship = authorRelationships.get(post.author.toString());
            const authorStat = authorStats.get(post.author.toString());

            return {
                ...post,
                isLiked: likedSet.has(post.author.toString()),
                isDisliked: dislikedSet.has(post.author.toString()),
                isPinned: pinSet.has(post.author.toString()),
                authorRelationship: {
                    ...authorRelationship,
                    stats: authorStat
                }
            };
        });

        return enhancedPosts as any;
    }

    private async getAuthorRelationships(
        posts: PostType[],
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

    private async getAuthorStats(posts: PostType[]): Promise<Map<string, any>> {
        const authorIds = [...new Set(posts.map(post => post.author.toString()))];

        if (authorIds.length === 0) {
            return new Map();
        }

        const statsMap = new Map();

        // Get stats for all authors in batch (you might need to implement this in RelationshipService)
        const statsPromises = authorIds.map(authorId =>
            this.relationshipService.getUserStats(authorId)
        );

        const statsResults = await Promise.all(statsPromises);

        statsResults.forEach(stat => {
            statsMap.set(stat.userId.toString(), {
                followerCount: stat.followerCount,
                followingCount: stat.followingCount,
                friendCount: stat.friendCount,
                pendingRequests: stat.pendingRequests || 0 // Add if you have post counts
            });
        });

        return statsMap;
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

    public async getPosts(userId: GetPostsInput['userId']): Promise<PostResponseType[]> {
        try {
            userId;

            if (!userId) throw new AppError('User ID not found in token', 400, 'User Service');

            const posts = await this.repository.getPosts();

            const enhancedPosts = await this.enhancePostsWithEngagementInfo(posts, userId.toString());
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
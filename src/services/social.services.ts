import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { RelationshipRepository } from "src/repositories/social.repository";
import { ReturnResponseType } from "src/types/base.type";
import { FollowRequestInput, RelationshipBase } from "src/types/social.type";
import { AppError } from "src/utils/errors";

export class RelationshipService {
    private relationshipRepository = new RelationshipRepository();

    async followUser(input: FollowRequestInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to follow user!', 500, 'Relationship Service');
        }
    }

    async unfollowUser(input: FollowRequestInput): Promise<void> {
        try {
            const { requester, recipient, type } = input;
            await this.relationshipRepository.removeRelationship(requester.toString(), recipient.toString(), type);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to unfollow user!', 500, 'Relationship Service');
        }
    }

    async sendFriendRequest(input: FollowRequestInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to send friend request!', 500, 'Relationship Service');
        }
    }

    async acceptFriendRequest(input: FollowRequestInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to accept friend request!', 500, 'Relationship Service');
        }
    }

    async declineFriendRequest(input: FollowRequestInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to decline friend request!', 500, 'Relationship Service');
        }
    }

    async removeFriend(input: FollowRequestInput): Promise<void> {
        try {
            const { requester, recipient } = input;

            await Promise.all([
                this.relationshipRepository.removeRelationship(requester.toString(), recipient.toString(), RelationshipTypeEnum.FOLLOW),
                this.relationshipRepository.removeRelationship(requester.toString(), recipient.toString(), RelationshipTypeEnum.FOLLOW)
            ]);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to remove friend!', 500, 'Relationship Service');
        }
    }

    async blockUser(input: FollowRequestInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to block user!', 500, 'Relationship Service');
        }
    }

    async unblockUser(input: FollowRequestInput): Promise<void> {
        try {
            const { requester, recipient, type } = input;
            await this.relationshipRepository.removeRelationship(requester.toString(), recipient.toString(), type);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to unblock user!', 500, 'Relationship Service');
        }
    }

    async getFollowers(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
        try {
            const { relationships, total, totalPages } = await this.relationshipRepository.getFollowers(userId, page, limit);

            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }

            return { data: relationships, metaData }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get followers!', 500, 'Relationship Service');
        }
    }

    async getFollowing(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
        try {
            const { relationships, total, totalPages } = await this.relationshipRepository.getFollowing(userId, page, limit);

            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }

            return { data: relationships, metaData }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get following!', 500, 'Relationship Service');
        }

    }

    async getFriends(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
        try {
            const { relationships, total, totalPages } = await this.relationshipRepository.getFriends(userId, page, limit);
            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }


            return { data: relationships, metaData }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get friends!', 500, 'Relationship Service');
        }
    }

    async getAllRelations(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
        try {
            const { relationships, total, totalPages } = await this.relationshipRepository.getAllRelations(userId, page, limit);

            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }

            return { data: relationships, metaData }

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get All Relations!', 500, 'Relationship Service');
        }
    }

    async getPendingRequests(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipBase[], total: number, page: number, totalPages: number }> {
        try {
            return await this.relationshipRepository.getPendingRequests(userId, page, limit);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get pending requests!', 500, 'Relationship Service');
        }
    }

    async getUserStats(userId: string): Promise<{ follower_count: number, following_count: number, friend_count: number, pendingRequests: number }> {
        try {
            return await this.relationshipRepository.getUserStats(userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get user stats!', 500, 'Relationship Service');
        }
    }


}
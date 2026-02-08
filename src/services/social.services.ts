import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { RelationshipRepository } from "src/repositories/social.repository";
import { ReturnResponseType } from "src/types/base.type";
import { BatchRelationshipStatus, RelationshipInput, RelationshipType } from "src/types/social.type";
import { AppError } from "src/utils/errors";
import { MessageService } from "./message.service";


export class RelationshipService {
    private messageService = new MessageService();

    private relationshipRepository = new RelationshipRepository();

    async followUser(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to follow user!', 500, 'Relationship Service');
        }
    }

    async unfollowUser(input: RelationshipInput): Promise<void> {
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

    async sendFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to send friend request!', 500, 'Relationship Service');
        }
    }

    async acceptFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to accept friend request!', 500, 'Relationship Service');
        }
    }

    async declineFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to decline friend request!', 500, 'Relationship Service');
        }
    }

    async removeFriend(input: RelationshipInput): Promise<void> {
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

    async blockUser(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to block user!', 500, 'Relationship Service');
        }
    }

    async unblockUser(input: RelationshipInput): Promise<void> {
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

            const sortedRelationships = await this.messageService.sortFriendsByLatestMessage(relationships, userId);

            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }


            return { data: sortedRelationships, metaData }
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

    async getPendingRequests(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipType[], total: number, page: number, totalPages: number }> {
        try {
            return await this.relationshipRepository.getPendingRequests(userId, page, limit);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get pending requests!', 500, 'Relationship Service');
        }
    }

    async getUserStats(userId: string): Promise<{ followerCount: number, followingCount: number, friendCount: number, pendingRequests: number }> {
        try {
            return await this.relationshipRepository.getUserStats(userId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get user stats!', 500, 'Relationship Service');
        }
    }

    async getBatchRelationshipStatus(userId: string, targetUserIds: string[]): Promise<BatchRelationshipStatus> {
        try {
            return await this.relationshipRepository.getBatchRelationshipStatus(userId, targetUserIds);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get batch relationship status!', 500, 'Relationship Service');
        }
    }
}
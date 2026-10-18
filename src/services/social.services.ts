import { RelationshipTypeEnum } from 'src/enums/social.enum';
import { RelationshipRepository } from 'src/repositories/social.repository';
import { ReturnResponseType } from 'src/types/base.type';
import { BlockUserInput, FollowRequestInput, UserStats } from 'src/types/social.type';
import { AppError } from 'src/utils/errors';

export class RelationshipService {
  private relationshipRepository = new RelationshipRepository();

  async followUser(input: FollowRequestInput): Promise<UserStats[]> {
    try {
      await this.relationshipRepository.createRelationship(input);
      const result = await Promise.all([
        this.relationshipRepository.getUserStats(input.requester.toString()),
        this.relationshipRepository.getUserStats(input.recipient.toString()),
      ]);
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to follow user!', 500, 'Relationship Service');
    }
  }

  async unfollowUser(input: FollowRequestInput): Promise<UserStats[]> {
    try {
      const { requester, recipient, type } = input;
      await this.relationshipRepository.removeRelationship(
        requester.toString(),
        recipient.toString(),
        type
      );

      const result = await Promise.all([
        this.relationshipRepository.getUserStats(requester.toString()),
        this.relationshipRepository.getUserStats(recipient.toString()),
      ]);
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to unfollow user!', 500, 'Relationship Service');
    }
  }

  async removeFriend(input: FollowRequestInput): Promise<UserStats> {
    try {
      const requesterId = input.requester.toString();
      const recipientId = input.recipient.toString();

      await Promise.all([
        this.relationshipRepository.removeRelationship(
          requesterId,
          recipientId,
          RelationshipTypeEnum.FOLLOW
        ),
        this.relationshipRepository.removeRelationship(
          recipientId,
          requesterId,
          RelationshipTypeEnum.FOLLOW
        ),
      ]);

      return await this.relationshipRepository.getUserStats(recipientId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove friend!', 500, 'Relationship Service');
    }
  }

  async getBlockedUsers(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
    try {
      const { relationships, total, totalPages } = await this.relationshipRepository.getBlockedUsers(
        userId,
        page,
        limit
      );

      return {
        data: relationships,
        metaData: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blocked users!', 500, 'Relationship Service');
    }
  }

  async blockUser(input: BlockUserInput): Promise<void> {
    try {
      const requesterId = input.requester.toString();
      const recipientId = input.recipient.toString();

      if (requesterId === recipientId) {
        throw new AppError('You cannot block yourself', 400, 'Relationship Service');
      }

      // Delegate to the optimized DB-level method
      await this.relationshipRepository.blockUser(requesterId, recipientId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to block user!', 500, 'Relationship Service');
    }
  }

  async unblockUser(input: BlockUserInput): Promise<void> {
    try {
      const requesterId = input.requester.toString();
      const recipientId = input.recipient.toString();

      if (requesterId === recipientId) {
        throw new AppError('You cannot unblock yourself', 400, 'Relationship Service');
      }

      // Delegate to the optimized DB-level method
      await this.relationshipRepository.unblockUser(requesterId, recipientId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to unblock user!', 500, 'Relationship Service');
    }
  }

  async reportUser(requesterId: string, targetUserId: string, reason: string) {
    try {
      if (requesterId === targetUserId) {
        throw new AppError('You cannot report yourself', 400, 'Relationship Service');
      }

      const report = await this.relationshipRepository.createReport(requesterId, targetUserId, reason);
      return report;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to report user!', 500, 'Relationship Service');
    }
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
    try {
      const { relationships, total, totalPages } = await this.relationshipRepository.getFollowers(
        userId,
        page,
        limit
      );

      const metaData = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return { data: relationships, metaData };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get followers!', 500, 'Relationship Service');
    }
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
    try {
      const { relationships, total, totalPages } = await this.relationshipRepository.getFollowing(
        userId,
        page,
        limit
      );

      const metaData = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return { data: relationships, metaData };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get following!', 500, 'Relationship Service');
    }
  }

  async getFriends(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
    try {
      const { relationships, total, totalPages } = await this.relationshipRepository.getFriends(
        userId,
        page,
        limit
      );

      const metaData = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return { data: relationships, metaData };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get friends!', 500, 'Relationship Service');
    }
  }

  async getAllRelations(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
    try {
      const { relationships, total, totalPages } = await this.relationshipRepository.getAllRelations(
        userId,
        page,
        limit
      );

      const metaData = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return { data: relationships, metaData };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get all relations!', 500, 'Relationship Service');
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      return await this.relationshipRepository.getUserStats(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get user stats!', 500, 'Relationship Service');
    }
  }
}
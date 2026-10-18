// src/repositories/relationship.repository.ts

import { ObjectId } from 'mongodb';
import { RelationshipStatusEnum, RelationshipTypeEnum } from 'src/enums/social.enum';
import { MessageModel } from 'src/models/message.model';
import { ReportModel } from 'src/models/report.model';
import { RelationshipModel } from 'src/models/social.model';
import { UserModel } from 'src/models/user.model';
import {
    AllRelationsType,
    CreateRelationshipInput,
    RelationshipResponse,
    UserStats,
} from 'src/types/social.type';
import { AppError, DatabaseError } from 'src/utils/errors';

export const CommonRelationshipPopulateQuery =
    'username name profilePhoto bio status lastActive verified accountType follower_count following_count friend_count genUserId';

export class RelationshipRepository {
    private formatAccountDetails(user: any) {
        if (!user) {
            return {
                userId: '',
                genUserId: '',
                email: '',
                username: '',
                name: 'Unknown User',
                profilePhoto: '',
                bio: '',
                status: '',
                lastActive: null,
                verified: false,
                accountType: '',
                follower_count: 0,
                following_count: 0,
                friend_count: 0,
            };
        }

        const userId = user._id ? user._id.toString() : user.id ? user.id.toString() : String(user);
        const fullName =
            user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';

        return {
            userId,
            genUserId: user.genUserId || '',
            email: user.email || '',
            username: user.username || '',
            name: fullName,
            profilePhoto: user.profilePhoto || user.avatarUrl || '',
            bio: user.bio || '',
            status: user.status || '',
            lastActive: user.lastActive || null,
            verified: Boolean(user.verified),
            accountType: user.accountType || '',
            follower_count: user.follower_count || 0,
            following_count: user.following_count || 0,
            friend_count: user.friend_count || 0,
        };
    }

    /**
     * PRODUCTION-GRADE FRIENDS LIST WITH DATABASE-LEVEL BUBBLING
     * Uses MongoDB aggregation pipeline on MessageModel to fetch friends, 
     * find their latest message timestamps, and sort them instantly at scale.
     */
    public async getFriends(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ relationships: AllRelationsType[]; total: number; page: number; totalPages: number }> {
        try {
            const skip = (page - 1) * limit;
            const userObjId = new ObjectId(userId);

            // 1. Find all user IDs that are mutual friends
            const userFollowing = await RelationshipModel.find({
                requester: userObjId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            })
                .select('recipient')
                .lean();

            const followingIds = userFollowing.map((rel) => rel.recipient);

            if (!followingIds.length) {
                return { relationships: [], total: 0, page, totalPages: 0 };
            }

            const mutualQuery = {
                requester: { $in: followingIds },
                recipient: userObjId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            };

            const [friendships, total] = await Promise.all([
                RelationshipModel.find(mutualQuery)
                    .populate('requester', CommonRelationshipPopulateQuery)
                    .lean(),
                RelationshipModel.countDocuments(mutualQuery),
            ]);

            const friendUserIds = friendships.map((f: any) => f.requester?._id).filter(Boolean);

            if (!friendUserIds.length) {
                return { relationships: [], total: 0, page, totalPages: 0 };
            }

            // 2. Aggregate latest messages from MessageModel for these specific friends in a single database pass
            const latestMessages = await MessageModel.aggregate([
                {
                    $match: {
                        $or: [
                            { authorId: userId, recipientId: { $in: friendUserIds.map(String) } },
                            { authorId: { $in: friendUserIds.map(String) }, recipientId: userId },
                        ],
                    },
                },
                { $sort: { createdAt: -1 } }, {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$authorId', userId] },
                                '$recipientId',
                                '$authorId',
                            ],
                        },
                        lastMessageId: { $first: '$_id' },
                        text: { $first: '$text' },
                        createdAt: { $first: '$createdAt' },
                        recipientId: { $first: '$recipientId' },
                        isRead: { $first: '$isRead' },
                    },
                },
            ]);

            const messageMap = new Map(latestMessages.map((m: any) => [String(m._id), m]));

            // 3. Map friends and attach their latest message info
            const mappedFriends = friendships.map((rel: any) => {
                const friendObj = rel.requester;
                const friendIdStr = friendObj?._id ? friendObj._id.toString() : '';
                const lastMsg: any = messageMap.get(friendIdStr);

                const isUnread = lastMsg ? String(lastMsg.recipientId) === String(userId) && !lastMsg.isRead : false;

                return {
                    accountDetails: this.formatAccountDetails(friendObj) as any,
                    type: rel.type,
                    status: rel.status,
                    relation: 'friend' as const,
                    latestMessage: lastMsg
                        ? {
                            _id: lastMsg.lastMessageId?.toString(),
                            text: lastMsg.text,
                            createdAt: new Date(lastMsg.createdAt).toISOString(),
                            isUnread,
                        }
                        : null,
                    // Store sorting metric explicitly
                    sortTimestamp: lastMsg ? new Date(lastMsg.createdAt).getTime() : new Date(friendObj?.lastActive || 0).getTime(),
                };
            });

            // 4. Sort so conversations with the newest messages bubble up to the top
            mappedFriends.sort((a, b) => b.sortTimestamp - a.sortTimestamp);

            // 5. Apply pagination slice
            const paginated = mappedFriends.slice(skip, skip + limit).map(({ sortTimestamp, ...rest }) => rest);

            return {
                relationships: paginated,
                page,
                total,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new DatabaseError(error, 'RelationshipRepository.getFriends');
        }
    }

    public async createRelationship(relationshipData: CreateRelationshipInput): Promise<void> {
        try {
            const requesterId = relationshipData.requester.toString();
            const recipientId = relationshipData.recipient.toString();

            if (requesterId === recipientId) {
                throw new AppError('Cannot create a relationship with yourself', 400, 'Relationship Repository');
            }

            const existingRelationship = await RelationshipModel.findOne({
                requester: relationshipData.requester,
                recipient: relationshipData.recipient,
            });

            if (existingRelationship) {
                throw new AppError('Relationship already exists', 422, 'Relationship Repository');
            }

            const status =
                relationshipData.type === RelationshipTypeEnum.BLOCK
                    ? RelationshipStatusEnum.BLOCKED
                    : RelationshipStatusEnum.ACCEPTED;

            const relationship = await RelationshipModel.create({
                ...relationshipData,
                status,
            });

            if (!relationship) {
                throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
            }

            await this.updateUserStats(requesterId, recipientId);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
        }
    }

    public async removeRelationship(
        requesterId: string,
        recipientId: string,
        type: RelationshipResponse['type'] = RelationshipTypeEnum.FOLLOW
    ): Promise<boolean> {
        const result = await RelationshipModel.deleteOne({
            requester: requesterId,
            recipient: recipientId,
            type,
        });

        if (result.deletedCount > 0) {
            await this.updateUserStats(requesterId, recipientId);
        }

        return result.deletedCount > 0;
    }

    public async getRelationship(requesterId: string, recipientId: string): Promise<RelationshipResponse | null> {
        return await RelationshipModel.findOne({
            requester: requesterId,
            recipient: recipientId,
        }).lean();
    }

    public async getFollowers(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ relationships: AllRelationsType[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const query = {
            recipient: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        };

        const [followerships, total] = await Promise.all([
            RelationshipModel.find(query)
                .populate('requester', CommonRelationshipPopulateQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments(query),
        ]);

        const relationships = followerships.map((rel: any) => ({
            accountDetails: this.formatAccountDetails(rel.requester) as any,
            type: rel.type,
            status: rel.status,
            relation: 'follower' as const,
            latestMessage: null,
        }));

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    public async getFollowing(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ relationships: AllRelationsType[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const userFollowing = await RelationshipModel.find({
            requester: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        })
            .select('recipient')
            .lean();

        const followingIds = userFollowing.map((rel) => rel.recipient.toString());

        if (!followingIds.length) {
            return { relationships: [], page, total: 0, totalPages: 0 };
        }

        const mutualFollows = await RelationshipModel.find({
            requester: { $in: followingIds },
            recipient: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        })
            .select('requester')
            .lean();

        const mutualFollowIds = new Set(mutualFollows.map((rel) => rel.requester.toString()));
        const oneWayFollowingIds = followingIds.filter((id) => !mutualFollowIds.has(id));

        if (!oneWayFollowingIds.length) {
            return { relationships: [], page, total: 0, totalPages: 0 };
        }

        const query = {
            requester: userId,
            recipient: { $in: oneWayFollowingIds },
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        };

        const [followingships, total] = await Promise.all([
            RelationshipModel.find(query)
                .populate('recipient', CommonRelationshipPopulateQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments(query),
        ]);

        const relationships = followingships.map((rel: any) => ({
            accountDetails: this.formatAccountDetails(rel.recipient) as any,
            type: rel.type,
            status: rel.status,
            relation: 'following' as const,
            latestMessage: null,
        }));

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    public async getAllRelations(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ relationships: AllRelationsType[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const userFollowing = await RelationshipModel.find({
            requester: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        })
            .select('recipient')
            .lean();

        const followingIds = userFollowing.map((rel) => rel.recipient.toString());

        if (!followingIds.length) {
            return { relationships: [], page, total: 0, totalPages: 0 };
        }

        const [mutuals, followings, total] = await Promise.all([
            RelationshipModel.find({
                requester: { $in: followingIds },
                recipient: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            })
                .select('requester')
                .lean(),
            RelationshipModel.find({
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            })
                .populate('recipient', CommonRelationshipPopulateQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments({
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
        ]);

        const mutualIds = new Set(mutuals.map((rel) => rel.requester.toString()));

        const relationships = followings.map((rel: any) => {
            const recipientId = rel.recipient?._id ? rel.recipient._id.toString() : String(rel.recipient);

            return {
                accountDetails: this.formatAccountDetails(rel.recipient) as any,
                type: rel.type,
                status: rel.status,
                relation: (mutualIds.has(recipientId) ? 'friend' : 'following') as 'friend' | 'following',
                latestMessage: null,
            };
        });

        return {
            relationships,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    public async getUserStats(userId: string): Promise<UserStats> {
        const user = await UserModel.findById(userId)
            .select('follower_count following_count friend_count')
            .lean();

        if (!user) {
            throw new AppError('User not found', 404, 'Relationship Repository');
        }

        return {
            userId,
            follower_count: user.follower_count || 0,
            following_count: user.following_count || 0,
            friend_count: user.friend_count || 0,
        };
    }

    public async updateUserStats(userA: string, userB: string): Promise<void> {
        await Promise.all([
            this.syncSingleUserStats(userA),
            this.syncSingleUserStats(userB),
        ]);
    }

    private async syncSingleUserStats(userId: string): Promise<void> {
        if (!userId) return;

        const [followingCount, followerCount, friendCount] = await Promise.all([
            RelationshipModel.countDocuments({
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
            RelationshipModel.countDocuments({
                recipient: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
            this.getFriendCount(userId),
        ]);

        await UserModel.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    following_count: followingCount,
                    follower_count: followerCount,
                    friend_count: friendCount,
                    lastUpdated: new Date(),
                },
            }
        );
    }

    private async getFriendCount(userId: string): Promise<number> {
        const userFollowing = await RelationshipModel.find({
            requester: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        })
            .select('recipient')
            .lean();

        const followingIds = userFollowing.map((rel) => rel.recipient.toString());

        if (!followingIds.length) return 0;

        return await RelationshipModel.countDocuments({
            requester: { $in: followingIds },
            recipient: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        });
    }

    public async areFriends(userId1: string, userId2: string): Promise<boolean> {
        const [u1FollowsU2, u2FollowsU1] = await Promise.all([
            RelationshipModel.exists({
                requester: userId1,
                recipient: userId2,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
            RelationshipModel.exists({
                requester: userId2,
                recipient: userId1,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
        ]);

        return Boolean(u1FollowsU2 && u2FollowsU1);
    }

    public async checkExistingBlock(requesterId: string, targetUserId: string) {
        return await RelationshipModel.findOne({
            requester: new ObjectId(requesterId),
            recipient: new ObjectId(targetUserId),
            type: RelationshipTypeEnum.BLOCK,
        }).lean();
    }

    public async blockUser(requesterId: string, targetUserId: string) {
        const reqId = new ObjectId(requesterId);
        const targetId = new ObjectId(targetUserId);

        // 1. Upsert relationship A -> B to BLOCK
        const blockRecord = await RelationshipModel.findOneAndUpdate(
            { requester: reqId, recipient: targetId },
            {
                $set: {
                    type: RelationshipTypeEnum.BLOCK,
                    status: RelationshipStatusEnum.BLOCKED,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        // 2. Force B to unfollow A (Remove the reverse follow if it exists)
        await RelationshipModel.deleteOne({
            requester: targetId,
            recipient: reqId,
            type: RelationshipTypeEnum.FOLLOW
        });

        await this.updateUserStats(requesterId, targetUserId);

        return blockRecord;
    }

    public async unblockUser(requesterId: string, targetUserId: string) {
        // Delete the block record
        const result = await RelationshipModel.deleteOne({
            requester: new ObjectId(requesterId),
            recipient: new ObjectId(targetUserId),
            type: RelationshipTypeEnum.BLOCK
        });

        if (result.deletedCount > 0) {
            await this.updateUserStats(requesterId, targetUserId);
        }
        return result.deletedCount > 0;
    }

    public async getBlockedUsers(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const query = {
            requester: userId,
            type: RelationshipTypeEnum.BLOCK,
            status: RelationshipStatusEnum.BLOCKED,
        };

        const [blocks, total] = await Promise.all([
            RelationshipModel.find(query)
                .populate('recipient', CommonRelationshipPopulateQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments(query),
        ]);

        const blockedUsers = blocks.map((rel: any) => ({
            accountDetails: this.formatAccountDetails(rel.recipient) as any,
            type: rel.type,
            status: rel.status,
            relation: 'blocked' as const,
        }));

        return {
            relationships: blockedUsers,
            page,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    public async createReport(requesterId: string, targetUserId: string, reason: string) {
        const report = await ReportModel.create({
            reporter: new ObjectId(requesterId),
            reportedUser: new ObjectId(targetUserId),
            reason: reason,
            status: 'PENDING'
        });
        return report;
    }


}
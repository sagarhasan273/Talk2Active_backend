import { ObjectId } from 'mongodb';
import { RelationshipStatusEnum, RelationshipTypeEnum } from 'src/enums/social.enum';
import { RelationshipModel } from 'src/models/social.model';
import { UserModel } from 'src/models/user.model';
import {
    AllRelationsType,
    CreateRelationshipInput,
    RelationshipResponse,
    UpdateRelationshipInput,
    UserStats
} from 'src/types/social.type';
import { AppError, DatabaseError } from 'src/utils/errors';

export const CommonRelationshipPopulateQuery =
    'email username name firstName lastName profilePhoto avatarUrl bio status lastActive verified accountType follower_count following_count friend_count pendingRequests genUserId';

export class RelationshipRepository {
    /**
     * Helper to normalize populated Mongoose user objects into the accountDetails contract
     */
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
            pendingRequests: user.pendingRequests || 0,
        };
    }

    public async createRelationship(relationshipData: CreateRelationshipInput): Promise<void> {
        try {
            const existingRelationship = await RelationshipModel.findOne({
                requester: relationshipData.requester,
                recipient: relationshipData.recipient,
            });

            if (existingRelationship) {
                throw new AppError('Relationship already exists', 422, 'Relationship Repository');
            }

            const status =
                relationshipData.type === RelationshipTypeEnum.FOLLOW
                    ? RelationshipStatusEnum.ACCEPTED
                    : RelationshipStatusEnum.PENDING;

            const relationship = await RelationshipModel.create({
                ...relationshipData,
                status,
                acceptedAt: status === RelationshipStatusEnum.ACCEPTED ? new Date() : undefined,
            });

            if (!relationship) {
                throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
            }

            await this.updateUserStats(
                relationshipData.requester.toString(),
                relationshipData.recipient.toString()
            );
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
        }
    }

    async updateRelationship(relationshipId: string, updateData: UpdateRelationshipInput): Promise<void> {
        const relationship = await RelationshipModel.findById(relationshipId);

        if (!relationship) {
            throw new AppError('Relationship not found', 404, 'Relationship Repository');
        }

        if (updateData.status === RelationshipStatusEnum.ACCEPTED) {
            relationship.acceptedAt = new Date();
        }

        relationship.status = updateData.status;
        const update = await relationship.save();

        if (!update) {
            throw new AppError('Failed to update relationship', 500, 'Relationship Repository');
        }
        await this.updateUserStats(relationship.requester.toString(), relationship.recipient.toString());
    }

    async removeRelationship(
        requesterId: string,
        recipientId: string,
        type: RelationshipResponse['type']
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

    async getRealationship(requesterId: string, recipientId: string): Promise<RelationshipResponse | null> {
        return await RelationshipModel.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId },
            ],
        }).lean();
    }

    async getRelationships(requesterId: string, recipientIds: string[]): Promise<RelationshipResponse[]> {
        const relationships = await RelationshipModel.find({
            requester: requesterId,
            recipient: { $in: recipientIds },
        }).lean();
        return relationships
    }

    async getFollowingIds(userId: string): Promise<string[]> {
        const rawIds = await RelationshipModel.distinct('recipient', {
            requester: new ObjectId(userId),
            type: RelationshipTypeEnum.FOLLOW,
        });

        return rawIds.map((id) => id.toString());
    }

    async getBlockedIds(userId: string): Promise<string[]> {
        const rawIds = await RelationshipModel.distinct('recipient', {
            requester: new ObjectId(userId),
            type: RelationshipTypeEnum.BLOCK,
        });

        return rawIds.map((id) => id.toString());
    }

    async getRelationshipIds(userId: string): Promise<{
        followingSet: Set<string>;
        blockedSet: Set<string>;
    }> {
        try {
            const relationships = await RelationshipModel.find(
                {
                    requester: new ObjectId(userId),
                    type: { $in: [RelationshipTypeEnum.FOLLOW, RelationshipTypeEnum.BLOCK] },
                },
                { recipient: 1, type: 1 }
            ).lean();

            const followingSet = new Set<string>();
            const blockedSet = new Set<string>();

            for (const rel of relationships) {
                const recipientId = rel.recipient?.toString();
                if (!recipientId) continue;

                if (rel.type === RelationshipTypeEnum.FOLLOW) {
                    followingSet.add(recipientId);
                } else if (rel.type === RelationshipTypeEnum.BLOCK) {
                    blockedSet.add(recipientId);
                }
            }

            return { followingSet, blockedSet };
        } catch (error) {
            throw new DatabaseError(error, 'RelationshipRepository.getRelationshipIds');
        }
    }


    // Get followers of a user (people who follow this user)
    async getFollowers(
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
            accountDetails: this.formatAccountDetails(rel.requester),
            type: rel.type,
            status: rel.status,
            relation: 'follower',
            latestMessage: '',
        })) as AllRelationsType[];

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    // Get users followed by this user (excluding mutual follows/friends)
    async getFollowing(
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
            accountDetails: this.formatAccountDetails(rel.recipient),
            type: rel.type,
            status: rel.status,
            relation: 'following',
            latestMessage: '',
        })) as AllRelationsType[];

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    // Get user's friends (mutual follows)
    async getFriends(
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

        const followingIds = userFollowing.map((rel) => rel.recipient);

        if (!followingIds.length) {
            return { relationships: [], total: 0, page, totalPages: 0 };
        }

        const query = {
            requester: { $in: followingIds },
            recipient: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED,
        };

        const [friendships, total] = await Promise.all([
            RelationshipModel.find(query)
                .populate('requester', CommonRelationshipPopulateQuery)
                .select('recipient requester status type createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments(query),
        ]);

        const relationships = friendships.map((rel: any) => ({
            accountDetails: this.formatAccountDetails(rel.requester),
            type: rel.type,
            status: rel.status,
            relation: 'friend',
            latestMessage: '',
        })) as AllRelationsType[];

        return {
            relationships,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Get all relations initiated by this user (marked as either 'friend' or 'following')
    async getAllRelations(
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
                accountDetails: this.formatAccountDetails(rel.recipient),
                type: rel.type,
                status: rel.status,
                relation: mutualIds.has(recipientId) ? 'friend' : 'following',
                latestMessage: '',
            };
        }) as AllRelationsType[];

        return {
            relationships,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserStats(userId: string): Promise<UserStats> {
        const user = await UserModel.findById(userId)
            .select('follower_count following_count friend_count pendingRequests')
            .lean();

        if (!user) {
            throw new AppError('User not found', 404, 'Relationship Repository');
        }

        return {
            userId,
            follower_count: user.follower_count || 0,
            following_count: user.following_count || 0,
            friend_count: user.friend_count || 0,
            pendingRequests: user.pendingRequests || 0,
        };
    }

    async getPendingRequests(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ relationships: RelationshipResponse[]; total: number; page: number; totalPages: number }> {
        const skip = (page - 1) * limit;

        const query = {
            recipient: userId,
            type: RelationshipTypeEnum.FRIEND,
            status: RelationshipStatusEnum.PENDING,
        };

        const [relationships, total] = await Promise.all([
            RelationshipModel.find(query)
                .populate('requester', 'username name profilePhoto verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RelationshipModel.countDocuments(query),
        ]);

        return { relationships: relationships as any, page, total, totalPages: Math.ceil(total / limit) };
    }

    async updateUserStats(requesterId: string, recipientId: string): Promise<void> {
        const [requesterFollowing, requesterPendingSent] = await Promise.all([
            RelationshipModel.countDocuments({
                requester: requesterId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED,
            }),
            RelationshipModel.countDocuments({
                requester: requesterId,
                type: RelationshipTypeEnum.FRIEND,
                status: RelationshipStatusEnum.PENDING,
            }),
        ]);

        await UserModel.updateOne(
            { _id: new ObjectId(requesterId) },
            {
                $set: {
                    following_count: requesterFollowing,
                    pendingRequests: requesterPendingSent,
                },
            }
        );

        if (recipientId) {
            const [recipientFollowers, recipientPending, recipientFriends] = await Promise.all([
                RelationshipModel.countDocuments({
                    recipient: recipientId,
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED,
                }),
                RelationshipModel.countDocuments({
                    recipient: recipientId,
                    type: RelationshipTypeEnum.FRIEND,
                    status: RelationshipStatusEnum.PENDING,
                }),
                this.getfriend_count(recipientId),
            ]);

            await UserModel.updateOne(
                { _id: new ObjectId(recipientId) },
                {
                    $set: {
                        follower_count: recipientFollowers,
                        pendingRequests: recipientPending,
                        friend_count: recipientFriends,
                        lastUpdated: new Date(),
                    },
                }
            );
        }
    }

    private async getfriend_count(userId: string): Promise<number> {
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

    async areFriends(userId1: string, userId2: string): Promise<boolean> {
        const [userFollowsUser2, user2FollowsUser1] = await Promise.all([
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

        return Boolean(userFollowsUser2 && user2FollowsUser1);
    }
}
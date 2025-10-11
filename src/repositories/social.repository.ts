import { ObjectId } from 'mongodb';
import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { RelationshipModel } from "src/models/social.model";
import { UserModel } from "src/models/user.model";
import { BatchRelationshipStatus, RelationshipInput, RelationshipType, UpdateRelationship, UserStats } from "src/types/social.type";
import { AppError } from "src/utils/errors";

export class RelationshipRepository {
    // Repository methods would go here
    public async createRelationship(relationshipData: RelationshipInput): Promise<void> {
        try {
            // Check if a relationship already exists between the two users
            const existingRelationship = await RelationshipModel.findOne({
                requester: relationshipData.requester,
                recipient: relationshipData.recipient,
            });

            if (existingRelationship) {
                throw new AppError('Relationship already exists', 422, 'Relationship Repository');
            }

            const status = relationshipData.type === RelationshipTypeEnum.FOLLOW ? RelationshipStatusEnum.ACCEPTED : RelationshipStatusEnum.PENDING;

            // If a relationship exists, update its status
            const relationship = await RelationshipModel.create({
                ...relationshipData,
                status: status,
                acceptedAt: status === RelationshipStatusEnum.ACCEPTED ? new Date() : undefined
            });

            if (!relationship) {
                throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
            }

            await this.updateUserStats(relationshipData.requester.toString(), relationshipData.recipient.toString());
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to create relationship', 500, 'Relationship Repository');
        }
    }

    async updateRelationship(relationshipId: string, updateData: UpdateRelationship): Promise<void> {
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

    // Remove relationship (unfollow, remove friend, unblock)
    async removeRelationship(requesterId: string, recipientId: string, type: RelationshipType['type']): Promise<boolean> {
        const result = await RelationshipModel.deleteOne({
            requester: requesterId,
            recipient: recipientId,
            type
        });

        if (result.deletedCount > 0) {
            await this.updateUserStats(requesterId, recipientId);
        }

        return result.deletedCount > 0;
    }

    // Get relationship between two users
    async getRealationship(requesterId: string, recipientId: string): Promise<RelationshipType | null> {
        return await RelationshipModel.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });
    }

    // Get followers of a user
    async getFollowers(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipType[], total: number, page: number, totalPages: number }> {

        const skip = (page - 1) * limit;

        const [relationships, total] = await Promise.all([
            RelationshipModel.find({
                recipient: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            })
                .populate('requester', 'username name profilePhoto verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RelationshipModel.countDocuments({
                recipient: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            })
        ]);

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    // Get users followed by a user
    async getFollowing(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipType[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;

        const [relationships, total] = await Promise.all([
            RelationshipModel.find({
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            })

                .populate('recipient', 'username name profilePhoto verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RelationshipModel.countDocuments({
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            })
        ]);

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    // Get user's friends (mutual follows)
    async getFriends(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipType[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const userFollowing = await RelationshipModel.find(
            {
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            }
        ).select('recipient');

        const followingIds = userFollowing.map(rel => rel.recipient);

        const [relationships, total] = await Promise.all([
            RelationshipModel.find(
                {
                    requester: { $in: followingIds },
                    recipient: userId,
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED
                }
            )
                .populate('requester', 'username name profilePhoto verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RelationshipModel.countDocuments(
                {
                    requester: { $in: followingIds },
                    recipient: userId,
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED
                }
            )
        ]);
        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    async getUserStats(userId: string): Promise<UserStats> {
        const user = await UserModel.findById(userId).select('followerCount followingCount friendCount pendingRequests');

        if (!user) {
            throw new AppError('User not found', 404, 'Relationship Repository');
        }

        return {
            userId,
            followerCount: user.followerCount || 0,
            followingCount: user.followingCount || 0,
            friendCount: user.friendCount || 0,
            pendingRequests: user.pendingRequests || 0
        };
    }

    // get pending friend requests
    async getPendingRequests(userId: string, page: number = 1, limit: number = 10): Promise<{ relationships: RelationshipType[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;

        const [relationships, total] = await Promise.all([
            RelationshipModel.find({
                recipient: userId,
                type: RelationshipTypeEnum.FRIEND,
                status: RelationshipStatusEnum.PENDING
            })
                .populate('requester', 'username name profilePhoto verified')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RelationshipModel.countDocuments({
                recipient: userId,
                type: RelationshipTypeEnum.FRIEND,
                status: RelationshipStatusEnum.PENDING
            })
        ]);

        return { relationships, page, total, totalPages: Math.ceil(total / limit) };
    }

    async updateUserStats(requesterId: string, recipientId: string): Promise<void> {
        const requesterFollowing = await RelationshipModel.countDocuments({
            requester: requesterId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED
        });

        const requesterPendingSent = await RelationshipModel.countDocuments({
            requester: requesterId,
            type: RelationshipTypeEnum.FRIEND,
            status: RelationshipStatusEnum.PENDING
        });

        await UserModel.findOneAndUpdate({ _id: new ObjectId(requesterId) }, {
            followingCount: requesterFollowing,
            pendingRequests: requesterPendingSent
        });

        if (recipientId) {
            const recipientFollowers = await RelationshipModel.countDocuments(
                {
                    recipient: recipientId,
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED
                }
            );

            const recipientPending = await RelationshipModel.countDocuments(
                {
                    recipient: recipientId,
                    type: RelationshipTypeEnum.FRIEND,
                    status: RelationshipStatusEnum.PENDING
                }
            );

            const recipientFriends = await this.getFriendCount(recipientId);

            await UserModel.findOneAndUpdate({ _id: new ObjectId(recipientId) }, {
                followerCount: recipientFollowers,
                pendingRequests: recipientPending,
                friendCount: recipientFriends,
                lastUpdated: new Date()
            });
        }
    }

    private async getFriendCount(userId: string): Promise<number> {
        const userFollowing = await RelationshipModel.find(
            {
                requester: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            }
        ).select('recipient');

        const followingIds = userFollowing.map(rel => rel.recipient.toString());

        return await RelationshipModel.countDocuments(
            {
                requester: { $in: followingIds },
                recipient: userId,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            }
        )
    }

    // check relationship status between two users
    async getBatchRelationshipStatus(userId: string, targetUserIds: string[]): Promise<BatchRelationshipStatus> {
        const objectIds = targetUserIds.map(id => new ObjectId(id));

        const relationships = await RelationshipModel.find({
            $or: [
                { requester: userId, recipient: { $in: objectIds } },
                { requester: { $in: objectIds }, recipient: userId }
            ]
        });

        const statuses: BatchRelationshipStatus['statuses'] = targetUserIds.map(targetUserId => {
            const targetId = new ObjectId(targetUserId);

            const outgoing = relationships.find(rel =>
                rel.requester.toString() === userId && rel.recipient.toString() === targetUserId
            );

            const incoming = relationships.find(rel =>
                rel.requester.toString() === targetUserId && rel.recipient.toString() === userId
            );

            const following = outgoing?.type === RelationshipTypeEnum.FOLLOW && outgoing.status === RelationshipStatusEnum.ACCEPTED;
            const followers = incoming?.type === RelationshipTypeEnum.FOLLOW && incoming.status === RelationshipStatusEnum.ACCEPTED;
            const friends = following && followers;
            const blocked = outgoing?.type === RelationshipTypeEnum.BLOCK;
            const pending = outgoing?.type === RelationshipTypeEnum.FRIEND && outgoing.status === RelationshipStatusEnum.PENDING;

            return {
                targetUserId: targetId,
                relationship: blocked
                    ? "blocked"
                    : pending
                        ? "pending"
                        : friends
                            ? "friends"
                            : following
                                ? "following"
                                : "none" as "friends" | "pending" | "blocked" | "following" | "none",
                following,
                followers,
                friends,
                blocked,
                pending
            };
        });

        return {
            userId,
            targetUserIds: objectIds,
            statuses
        };
    }

    async areFriends(userId1: string, userId2: string): Promise<boolean> {
        const [userFollowsUser2, user2FollowsUser1] = await Promise.all([
            RelationshipModel.findOne({
                requester: userId1,
                recipient: userId2,

                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            }),
            RelationshipModel.findOne({
                requester: userId2,
                recipient: userId1,
                type: RelationshipTypeEnum.FOLLOW,
                status: RelationshipStatusEnum.ACCEPTED
            })
        ]);

        return !!(userFollowsUser2 && user2FollowsUser1);
    }
}
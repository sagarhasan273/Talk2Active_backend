// repositories/user-suggestion.repository.ts
import { ObjectId } from 'mongodb';
import { RelationshipModel } from 'src/models/social.model';
import { UserModel } from 'src/models/user.model';
import { UserResponseType } from 'src/types/user.type';
import { AppError } from 'src/utils/errors';
import { RelationshipStatusEnum, RelationshipTypeEnum } from '../enums/social.enum';

export class UserSuggestionRepository {
    /**
     * Get users followed by people you follow (2nd degree connections)
     */
    async getMutualConnectionSuggestions(
        userId: string,
        limit: number = 10
    ): Promise<any[]> {
        // First, get users that the current user follows
        const userFollowing = await RelationshipModel.find({
            requester: userId,
            type: RelationshipTypeEnum.FOLLOW,
            status: RelationshipStatusEnum.ACCEPTED
        }).select('recipient');

        const followingIds = userFollowing.map(rel => rel.recipient);

        if (followingIds.length === 0) {
            return this.getPopularUsersSuggestions(userId, limit);
        }

        // Find users that are followed by people you follow, but you don't follow yet
        const suggestions = await RelationshipModel.aggregate([
            {
                $match: {
                    requester: { $in: followingIds },
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED,
                    recipient: {
                        $ne: userId, // Not self
                        $nin: followingIds // Not already followed by current user
                    }
                }
            },
            {
                $group: {
                    _id: '$recipient',
                    mutualCount: { $sum: 1 },
                    mutualFollowers: { $push: '$requester' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 1,
                    username: '$userDetails.username',
                    name: '$userDetails.name',
                    avatar: '$userDetails.avatar',
                    mutualCount: 1,
                    isVerified: '$userDetails.isVerified',
                    bio: '$userDetails.bio'
                }
            },
            { $sort: { mutualCount: -1, 'userDetails.followersCount': -1 } },
            { $limit: limit }
        ]);

        return suggestions;
    }

    /**
     * Get popular users (most followed)
     */
    async getPopularUsersSuggestions(
        userId: string,
        limit: number = 10
    ): Promise<any[]> {
        const popularUsers = await RelationshipModel.aggregate([
            {
                $match: {
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED
                }
            },
            {
                $group: {
                    _id: '$recipient',
                    followersCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    _id: { $ne: userId } // Exclude self
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            // Check if current user already follows this popular user
            {
                $lookup: {
                    from: 'relationships',
                    let: { recipientId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$requester', userId] },
                                        { $eq: ['$recipient', '$$recipientId'] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] },
                                        { $eq: ['$status', RelationshipStatusEnum.ACCEPTED] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'existingRelationship'
                }
            },
            {
                $match: {
                    existingRelationship: { $size: 0 } // Only users not followed by current user
                }
            },
            {
                $project: {
                    _id: 1,
                    username: '$userDetails.username',
                    name: '$userDetails.name',
                    avatar: '$userDetails.avatar',
                    followersCount: 1,
                    isVerified: '$userDetails.isVerified',
                    bio: '$userDetails.bio'
                }
            },
            { $sort: { followersCount: -1 } },
            { $limit: limit }
        ]);

        return popularUsers;
    }

    /**
     * Get suggestions based on location or similar interests
     */
    async getContentBasedSuggestions(
        userId: string,
        limit: number = 10,
        currentUser?: any // User document with interests/location
    ): Promise<any[]> {
        let matchStage: any = {
            _id: { $ne: userId } // Exclude self
        };

        // Add location-based matching if available
        if (currentUser?.location) {
            matchStage.location = currentUser.location;
        }

        const suggestions = await RelationshipModel.aggregate([
            // First, get all users that current user follows
            {
                $match: {
                    requester: userId,
                    type: RelationshipTypeEnum.FOLLOW,
                    status: RelationshipStatusEnum.ACCEPTED
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'recipient',
                    foreignField: '_id',
                    as: 'followedUser'
                }
            },
            { $unwind: '$followedUser' },

            // Then find who they follow (with user details for filtering)
            {
                $lookup: {
                    from: 'relationships',
                    let: { followedUserId: '$followedUser._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$requester', '$$followedUserId'] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] },
                                        { $eq: ['$status', RelationshipStatusEnum.ACCEPTED] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'recipient',
                                foreignField: '_id',
                                as: 'suggestedUser'
                            }
                        },
                        { $unwind: '$suggestedUser' },
                        { $match: { 'suggestedUser._id': { $ne: userId } } }
                    ],
                    as: 'suggestedRelationships'
                }
            },
            { $unwind: '$suggestedRelationships' },

            // Group and count
            {
                $group: {
                    _id: '$suggestedRelationships.recipient',
                    userDetails: { $first: '$suggestedRelationships.suggestedUser' },
                    commonConnections: { $addToSet: '$followedUser._id' }
                }
            },
            {
                $addFields: {
                    commonConnectionsCount: { $size: '$commonConnections' }
                }
            },
            // Check if current user already follows this suggestion
            {
                $lookup: {
                    from: 'relationships',
                    let: { suggestedUserId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$requester', userId] },
                                        { $eq: ['$recipient', '$$suggestedUserId'] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'existingRelationship'
                }
            },
            {
                $match: {
                    existingRelationship: { $size: 0 } // Not already followed
                }
            },
            {
                $project: {
                    _id: 1,
                    username: '$userDetails.username',
                    name: '$userDetails.name',
                    avatar: '$userDetails.avatar',
                    bio: '$userDetails.bio',
                    location: '$userDetails.location',
                    interests: '$userDetails.interests',
                    commonConnectionsCount: 1,
                    isVerified: '$userDetails.isVerified'
                }
            },
            { $sort: { commonConnectionsCount: -1 } },
            { $limit: limit }
        ]);

        return suggestions;
    }

    /**
     * Hybrid approach combining multiple strategies
     */
    async getHybridSuggestions(
        userId: string,
        limit: number = 15,
        currentUser?: any
    ): Promise<any[]> {
        const [mutual, popular, contentBased] = await Promise.all([
            this.getMutualConnectionSuggestions(userId, 5),
            this.getPopularUsersSuggestions(userId, 5),
            this.getContentBasedSuggestions(userId, 5, currentUser)
        ]);

        // Combine and deduplicate
        const allSuggestions = [...mutual, ...popular, ...contentBased];
        const uniqueMap = new Map();

        allSuggestions.forEach(suggestion => {
            if (!uniqueMap.has(suggestion._id.toString())) {
                uniqueMap.set(suggestion._id.toString(), suggestion);
            }
        });

        const uniqueSuggestions = Array.from(uniqueMap.values());

        // Calculate relevance score and sort
        const scoredSuggestions = uniqueSuggestions.map(suggestion => ({
            ...suggestion,
            relevanceScore: this.calculateRelevanceScore(suggestion)
        }));

        return scoredSuggestions
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit);
    }

    private calculateRelevanceScore(suggestion: any): number {
        let score = 0;

        // Mutual connections are very valuable
        if (suggestion.mutualCount) {
            score += suggestion.mutualCount * 20;
        }
        if (suggestion.commonConnectionsCount) {
            score += suggestion.commonConnectionsCount * 15;
        }

        // Popularity matters but less than mutual connections
        if (suggestion.followersCount) {
            score += Math.log(suggestion.followersCount + 1) * 10;
        }

        // Verified users get a boost
        if (suggestion.isVerified) {
            score += 25;
        }

        return score;
    }

    /**
     * Get new users (recently joined)
     */
    async getNewUsersSuggestions(
        userId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ newUsers: UserResponseType[], total: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        // This would require a User model to get recently created accounts
        // Assuming you have a User model with createdAt field
        const result = await UserModel.aggregate([
            {
                $match: {
                    _id: { $ne: new ObjectId(userId) },
                    createdAt: {
                        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            // Exclude users that current user follows
            {
                $lookup: {
                    from: 'relationships',
                    let: { targetUserId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$requester', new ObjectId(userId)] },
                                        { $eq: ['$recipient', '$$targetUserId'] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'userFollowsThem'
                }
            },
            // Exclude users who follow current user (optional)
            {
                $lookup: {
                    from: 'relationships',
                    let: { targetUserId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$requester', '$$targetUserId'] },
                                        { $eq: ['$recipient', new ObjectId(userId)] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'theyFollowUser'
                }
            },
            // Filter out both cases
            {
                $match: {
                    $and: [
                        { userFollowsThem: { $size: 0 } }, // User doesn't follow them
                        // { theyFollowUser: { $size: 0 } } // Uncomment if you also want to exclude users who follow current user
                    ]
                }
            },
            // Get follower count for sorting
            {
                $lookup: {
                    from: 'relationships',
                    let: { targetUserId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$recipient', '$$targetUserId'] },
                                        { $eq: ['$type', RelationshipTypeEnum.FOLLOW] },
                                        { $eq: ['$status', RelationshipStatusEnum.ACCEPTED] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'allFollowers'
                }
            },
            {
                $addFields: {
                    followerCount: { $size: '$allFollowers' }
                }
            },
            {
                $facet: {
                    data: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                name: 1,
                                profilePhoto: 1,
                                coverPhoto: 1,
                                isVerified: 1,
                                bio: 1,
                                followerCount: 1,
                                followingCount: 1,
                                friendCount: 1,
                                createdAt: 1
                            }
                        },
                        { $sort: { followerCount: -1, createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        if (!result) {
            throw new AppError('Failed to Fetch', 404, 'User Suggestion Repository');
        }

        const newUsers = result[0]?.data || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        return { newUsers, total, totalPages: Math.ceil(total / limit) };
    }
}
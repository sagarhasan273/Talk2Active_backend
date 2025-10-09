// schemas/relationship.schema.ts
import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { z } from "zod";
import { objectIdSchema } from "./base.schema";

// Base Relationship Schema
export const RelationshipSchema = z.object({
    requester: objectIdSchema, // User who initiated the relationship
    recipient: objectIdSchema, // User who received the request
    type: z.nativeEnum(RelationshipTypeEnum),
    status: z.nativeEnum(RelationshipStatusEnum).default(RelationshipStatusEnum.PENDING),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
    acceptedAt: z.date().optional()
});

// Create Relationship Schema
export const CreateRelationshipSchema = RelationshipSchema.pick({
    requester: true,
    recipient: true,
    type: true
});

// Update Relationship Schema
export const UpdateRelationshipSchema = RelationshipSchema.pick({
    status: true
}).extend({
    relationshipId: objectIdSchema
});

// Follow Request Schema
export const FollowRequestSchema = CreateRelationshipSchema.extend({
    type: z.literal(RelationshipTypeEnum.FOLLOW)
});

// Friend Request Schema
export const FriendRequestSchema = CreateRelationshipSchema.extend({
    type: z.literal(RelationshipTypeEnum.FRIEND)
});

// Block User Schema
export const BlockUserSchema = CreateRelationshipSchema.extend({
    type: z.literal(RelationshipTypeEnum.BLOCK)
});

// Relationship Response Schema
export const RelationshipResponseSchema = RelationshipSchema.extend({
    id: z.string(),
    requesterDetails: z.object({
        _id: z.string(),
        username: z.string(),
        name: z.string().optional(),
        profilePhoto: z.string().url().optional(),
        verified: z.boolean().default(false)
    }).optional(),
    recipientDetails: z.object({
        _id: z.string(),
        username: z.string(),
        name: z.string().optional(),
        profilePhoto: z.string().url().optional(),
        verified: z.boolean().default(false)
    }).optional()
});

// User Statistics Schema
export const UserStatsSchema = z.object({
    userId: objectIdSchema,
    followerCount: z.number().int().nonnegative().default(0),
    followingCount: z.number().int().nonnegative().default(0),
    friendCount: z.number().int().nonnegative().default(0),
    pendingRequests: z.number().int().nonnegative().default(0)
});

// Followers/Following List Schema
export const RelationshipListSchema = z.object({
    userId: objectIdSchema,
    relationships: z.array(RelationshipResponseSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    type: z.enum(['followers', 'following', 'friends', 'pending'])
});

// Batch Relationship Status Schema
export const BatchRelationshipStatusSchema = z.object({
    userId: objectIdSchema,
    targetUserIds: z.array(objectIdSchema),
    statuses: z.array(z.object({
        targetUserId: objectIdSchema,
        relationship: z.enum(['following', 'friends', 'blocked', 'pending', 'none']),
        following: z.boolean(),
        followers: z.boolean(),
        friends: z.boolean(),
        blocked: z.boolean(),
        pending: z.boolean()
    }))
});


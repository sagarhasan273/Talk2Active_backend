// schemas/relationship.schema.ts
import { RelationshipStatusEnum, RelationshipTypeEnum } from 'src/enums/social.enum';
import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { DatePreprocessor } from './user.schema';

// ----------------------------------------------------------------------
// Reusable Sub-Schemas
// ----------------------------------------------------------------------

export const RelationshipUserSnippetSchema = z.object({
    _id: objectIdSchema,
    userId: objectIdSchema.optional(),
    genUserId: z.string().optional(),
    username: z.string().optional(),
    name: z.string().optional(),
    profilePhoto: z.string().url().nullable().optional(),
    verified: z.boolean().default(false),
    accountType: z.string().optional(),
});

// ----------------------------------------------------------------------
// Base Relationship Schema
// ----------------------------------------------------------------------

export const RelationshipSchema = z.object({
    requester: objectIdSchema,
    recipient: objectIdSchema,
    type: z.nativeEnum(RelationshipTypeEnum),
    status: z.nativeEnum(RelationshipStatusEnum).default(RelationshipStatusEnum.ACCEPTED),
    createdAt: DatePreprocessor.default(() => new Date()),
    updatedAt: DatePreprocessor.default(() => new Date()),
});

// ----------------------------------------------------------------------
// Action / Request Schemas
// ----------------------------------------------------------------------

export const CreateRelationshipSchema = RelationshipSchema.pick({
    requester: true,
    recipient: true,
    type: true,
});

export const UpdateRelationshipSchema = RelationshipSchema.pick({
    status: true,
}).extend({
    relationshipId: objectIdSchema,
});

export const FollowRequestSchema = CreateRelationshipSchema.extend({
    type: z.literal(RelationshipTypeEnum.FOLLOW),
});

export const BlockUserSchema = CreateRelationshipSchema.extend({
    type: z.literal(RelationshipTypeEnum.BLOCK),
});

// ----------------------------------------------------------------------
// Response & Query Schemas
// ----------------------------------------------------------------------

export const RelationshipResponseSchema = RelationshipSchema.extend({
    id: z.string().optional(),
    _id: objectIdSchema.optional(),
    requesterDetails: RelationshipUserSnippetSchema.optional(),
    recipientDetails: RelationshipUserSnippetSchema.optional(),
});

export const UserStatsSchema = z.object({
    userId: objectIdSchema,
    follower_count: z.number().int().nonnegative().default(0),
    following_count: z.number().int().nonnegative().default(0),
    friend_count: z.number().int().nonnegative().default(0),
});

export const RelationshipListSchema = z.object({
    userId: objectIdSchema,
    relationships: z.array(RelationshipResponseSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    type: z.enum(['followers', 'following', 'friends']),
});

// Single target relationship evaluation record
export const TargetRelationshipStatusSchema = z.object({
    targetUserId: objectIdSchema,
    relationship: z.enum(['following', 'friends', 'blocked', 'none']),
    isFollowing: z.boolean().default(false),
    isFollower: z.boolean().default(false),
    isFriend: z.boolean().default(false),
    isBlocked: z.boolean().default(false),
});

// Batch lookup payload (e.g. used by ChatService.enrichRoomWithRelationships)
export const BatchRelationshipStatusSchema = z.object({
    userId: objectIdSchema,
    targetUserIds: z.array(objectIdSchema),
    statuses: z.array(TargetRelationshipStatusSchema),
});
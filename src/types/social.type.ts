import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";

import { BatchRelationshipStatusSchema, BlockUserSchema, CreateRelationshipSchema, FollowRequestSchema, FriendRequestSchema, RelationshipListSchema, RelationshipResponseSchema, RelationshipSchema, RelationshipUserSnippetSchema, TargetRelationshipStatusSchema, UpdateRelationshipSchema, UserStatsSchema } from "src/schemas/social.schema";
import { z } from "zod";
import { UserResponseType } from "./user.type";

// Types for TypeScript

// ----------------------------------------------------------------------
// Type-From-Schemas
// ----------------------------------------------------------------------

export type RelationshipUserSnippet = z.infer<typeof RelationshipUserSnippetSchema>;
export type RelationshipBase = z.infer<typeof RelationshipSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>;
export type FollowRequestInput = z.infer<typeof FollowRequestSchema>;
export type FriendRequestInput = z.infer<typeof FriendRequestSchema>;
export type BlockUserInput = z.infer<typeof BlockUserSchema>;
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type RelationshipListResponse = z.infer<typeof RelationshipListSchema>;
export type TargetRelationshipStatus = z.infer<typeof TargetRelationshipStatusSchema>;
export type BatchRelationshipStatus = z.infer<typeof BatchRelationshipStatusSchema>;

export type RelationshipStatusEnum = typeof RelationshipStatusEnum[keyof typeof RelationshipStatusEnum];
export type RelationshipTypeEnum = typeof RelationshipTypeEnum[keyof typeof RelationshipTypeEnum];
export type AuthorRelationship = {
    relationship: 'following' | 'followers' | 'friends' | 'blocked' | 'pending' | 'none';
    following: boolean;
    followers: boolean;
    friends: boolean;
    blocked: boolean;
    pending: boolean;
}
export type AllRelationsType = {
    accountDetails: UserResponseType;
    relation: 'friend' | 'following' | 'follower';
    status: RelationshipStatusEnum;
    type: RelationshipTypeEnum;

}
import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { UserMessage } from "src/models/message.model";
import { BatchRelationshipStatusSchema, CreateRelationshipSchema, RelationshipListSchema, RelationshipResponseSchema, RelationshipSchema, UpdateRelationshipSchema, UserStatsSchema } from "src/schemas/social.schema";
import { z } from "zod";
import { UserType } from "./user.type";

// Types for TypeScript
export type RelationshipType = z.infer<typeof RelationshipSchema>;
export type RelationshipInput = z.infer<typeof CreateRelationshipSchema>;
export type FollowRequestInput = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationship = z.infer<typeof UpdateRelationshipSchema>;
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type RelationshipListResponse = z.infer<typeof RelationshipListSchema>;
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
    accountDetails: UserType;
    latestMessage: Partial<UserMessage> | null;
    relation: 'friend' | 'following' | 'follower';
    status: RelationshipStatusEnum;
    type: RelationshipTypeEnum;

}
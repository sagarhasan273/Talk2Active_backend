import { RelationshipStatusEnum, RelationshipTypeEnum } from "src/enums/social.enum";
import { BatchRelationshipStatusSchema, CreateRelationshipSchema, RelationshipListSchema, RelationshipResponseSchema, RelationshipSchema, UpdateRelationshipSchema, UserStatsSchema } from "src/schemas/social.schema";
import { z } from "zod";

// Types for TypeScript
export type RelationshipType = z.infer<typeof RelationshipSchema>;
export type CreateRelationship = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationship = z.infer<typeof UpdateRelationshipSchema>;
export type RelationshipResponse = z.infer<typeof RelationshipResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type RelationshipListResponse = z.infer<typeof RelationshipListSchema>;
export type BatchRelationshipStatus = z.infer<typeof BatchRelationshipStatusSchema>;
export type RelationshipStatusEnum = typeof RelationshipStatusEnum[keyof typeof RelationshipStatusEnum];
export type RelationshipTypeEnum = typeof RelationshipTypeEnum[keyof typeof RelationshipTypeEnum];
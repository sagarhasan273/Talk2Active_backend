// Relationship Status Enum
export const RelationshipStatusEnum = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    BLOCKED: 'blocked'
} as const;

// Relationship Type Enum
export const RelationshipTypeEnum = {
    FOLLOW: 'follow',
    FRIEND: 'friend',
    BLOCK: 'block'
} as const;
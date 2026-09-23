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

export enum SystemType {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
}

export enum MessageDataTopic {
    CHAT_MESSAGE = 'CHAT_MESSAGE',
    MESSAGE_EDIT = 'MESSAGE_EDIT',
    MESSAGE_REACTION = 'MESSAGE_REACTION',
}
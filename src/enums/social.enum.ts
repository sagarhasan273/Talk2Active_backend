export const RelationshipStatusEnum = {
    ACCEPTED: 'accepted',
    BLOCKED: 'blocked',
} as const;

export type RelationshipStatusType =
    (typeof RelationshipStatusEnum)[keyof typeof RelationshipStatusEnum];

export const RelationshipTypeEnum = {
    FOLLOW: 'follow',
    BLOCK: 'block',
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
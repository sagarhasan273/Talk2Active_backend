import { SystemType } from 'src/enums/social.enum';

export interface IReaction {
    emoji: string;
    userIds: string[];
}

export interface IFrontendReaction {
    emoji: string;
    count: number;
    reactedBySelf: boolean;
}

export interface IChatMessageDoc {
    _id: string;
    roomId: string;
    authorId?: string;
    authorName?: string;
    recipientId: string;
    text: string;
    isSystem?: boolean;
    systemType?: SystemType;
    replyToId?: string;
    editedAt?: number;
    isRead?: boolean;
    readAt?: Date | null;
    reactions: IReaction[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IFrontendChatMessage {
    id: string;
    text: string;
    isSelf?: boolean;
    isSystem?: boolean;
    systemType?: SystemType;
    authorId?: string;
    authorName?: string;
    recipientId?: string;
    editedAt?: number;
    isRead?: boolean;
    readAt?: string | null;
    reactions?: IFrontendReaction[];
    replyToId?: string;
    createdAt: string;
}

export interface IUnreadSummary {
  unreadBySender: Record<string, number>; 
  unreadFriendsCount: number;            
  totalUnreadMessages: number; 
}
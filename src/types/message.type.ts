import { SystemType } from "src/enums/social.enum";


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
    isRead?: boolean; // <-- Added 
    readAt?: Date;    // <-- Added
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
    editedAt?: number;
    isRead?: boolean; // <-- Added
    readAt?: Date;    // <-- Added
    reactions?: IFrontendReaction[];
    replyToId?: string;
    createdAt: string;
}
import { RoomBaseSchema, RoomCreateSchema, RoomResponseSchema } from "src/schemas/chat.schema";
import { z } from 'zod';

export type RoomBase = z.infer<typeof RoomBaseSchema>;
export type CreateRoomInput = z.infer<typeof RoomCreateSchema>;
export type RoomResponse = z.infer<typeof RoomResponseSchema>;

// Message
export type Reaction = {
    emoji: string;
    userId: string;
    name?: string;
    timestamp?: Date;
};

export type Message = {
    id?: string;
    text: string;
    sender: 'me' | 'them';
    time: string;
    isUnread: boolean;
    startOfUnread?: boolean;
    isPrivate: boolean;
    senderSocketId?: string;
    targetSocketId?: string;
    type: 'system' | 'message';
    systemMessageType?: 'user-joined' | 'you-joined' | 'user-left';
    userInfo: {
        userId: string;
        name: string;
        avatar?: string;
    };
    targetUserInfo?: {
        socketId: string;
        userId: string;
        name: string;
        avatar?: string;
    };
    mentions: {
        userId: string;
        name: string;
        avatar?: string;
    }[];
    isEdited?: boolean;
    reactions?: Reaction[];
};

export type ReactionMessageData = {
    roomId: string;
    messageId: number;
    reaction: Reaction;
}
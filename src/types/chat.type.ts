import { RoomBaseSchema, RoomCreateSchema, RoomResponseSchema, RoomUpdateSchema } from "src/schemas/chat.schema";
import { z } from 'zod';
import { UserType } from "./user.type";

export type RoomBase = z.infer<typeof RoomBaseSchema>;
export type CreateRoomInput = z.infer<typeof RoomCreateSchema>;
export type UpdateRoomInput = z.infer<typeof RoomUpdateSchema>;
export type RoomResponse = z.infer<typeof RoomResponseSchema>;

// Message
export type Reaction = {
    reactId: string;
    emoji: string;
    userId: string;
    name?: string;
};

export type Message = {
    id?: string;
    conversationId: string;
    text: string;
    sender: 'me' | 'them';
    time: Date | string;
    isUnread: boolean;
    startOfUnread?: boolean;
    isPrivate?: boolean;
    senderSocketId?: string;
    receiverSocketId?: string;
    type: 'system' | 'message';
    systemMessageType?: 'user-joined' | 'you-joined' | 'user-left' | 'mic-force-mute';
    senderInfo?: Partial<UserType>;
    receiverInfo?: Partial<UserType>;
    mentions?: UserType[];
    isEdited?: boolean;
    isDeleted?: boolean;
    reactions?: Reaction[];
    messageRepliedOf?: Partial<Message>;
    parentMessage?: string | Partial<Message>; // For threading
};

export type ReactionMessageData = {
    roomId: string;
    messageId: number;
    reaction: Reaction;
}
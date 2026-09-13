import { JoinRoomSchema, LeaveRoomSchema, RoomBaseSchema, RoomCreateSchema, RoomResponseSchema, RoomUpdateSchema } from "src/schemas/chat.schema";
import { z } from 'zod';
import { UserBaseType } from "./user.type";

export type RoomBase = z.infer<typeof RoomBaseSchema>;
export type CreateRoomInput = z.infer<typeof RoomCreateSchema>;
export type UpdateRoomInput = z.infer<typeof RoomUpdateSchema>;
export type RoomResponse = z.infer<typeof RoomResponseSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type LeaveRoomInput = z.infer<typeof LeaveRoomSchema>;

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
    senderInfo?: Partial<UserBaseType>;
    receiverInfo?: Partial<UserBaseType>;
    mentions?: UserBaseType[];
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


export type JoinRoomUserInput = {
    roomId: string;
    socketId: string;
    userId: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean;
    status: string;
    UserResponseType: 'host' | 'guest'
};

export type LeaveRoomUserInput = {
    roomId: string;
    socketId: string;
    userId: string;
    name: string;
    kicked?: boolean;
};

export type RoomParticipant = JoinRoomUserInput & {
    isLocal?: boolean
}
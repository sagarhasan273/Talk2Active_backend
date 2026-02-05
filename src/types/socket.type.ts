import { UserMessage } from "src/models/message.model";
import { Message } from "./chat.type";

export interface WebRTCData {
    target: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    sender?: string;
}

export interface ParticipantData {
    socketId: string;
    id: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean;
    status: string;
}

export interface UserData {
    roomId: string;
    userId: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean;
    status: string;
}

export interface JoinIndividualMessageData {
    userId: string;
    targetUserId: string;
}

export interface LeaveIndividualMessageData {
    userId: string;
    targetUserId: string;
}

export type IndividualMessageData = UserMessage & {
    userId: string;
    text: string;
    userInfo?: {
        name: string;
        userId: string;
        avatar?: string;
    };
}

export interface EditIndividualMessageData {
    messageId: string;
    userId: string;
    text: string;
    targetUserInfo: {
        userId: string;
        name: string;
        avatar?: string;
    };
}

export interface GroupMessageData {
    roomId: string;
    text: string;
    type: 'message' | 'system';
    systemMessageType?: 'user-joined' | 'user-left' | 'you-joined';
    userInfo?: {
        name: string;
        userId: string;
        avatar?: string;
    };
}

export interface EditGroupMessageData {
    roomId: string;
    text?: string;
    messageId: Message['id'];
}

export interface DeleteGroupMessageData {
    roomId: string;
    text?: string;
    messageId: Message['id'];
}

export interface PrivateMessageData {
    targetSocketId: string;
    message: string;
    name: string;
}

export interface DeleteIndividualMessageData {
    senderId: string;
    receiverId: string;
    text?: string;
    messageId: Message['id'];
}

export interface ReactionIndividualMessageData {
    senderId: string;
    receiverId: string;
    messageId: number;
    reaction: string;
}

export interface AudioToggleData {
    roomId: string;
    isMuted: boolean;
    name: string;
}

export interface StatusSelectData {
    roomId: string;
    status: string;
    name: string;
}
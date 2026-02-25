import { UserMessage } from "src/models/message.model";
import { Message } from "./chat.type";
import { UserType } from "./user.type";

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
    isLocal?: boolean
}

export interface UserData {
    roomId: string;
    userId: string;
    name: string;
    profilePhoto: string;
    isMuted: boolean;
    status: string;
}

export interface JoinLeaveIndividualMessageData {
    listeningUserId?: string;
    leaveListeningUserId?: string;
}

export interface LeaveIndividualMessageData {
    userId: string;
    targetUserId: string;
}

export type IndividualMessageData = UserMessage & {
    userId: string;
    text: string;

    senderInfo: Partial<UserType>;

    receiverInfo: Partial<UserType>;

    unreadMessageIds?: string[];
}

export interface EditIndividualMessageData {
    messageId: string;
    userId: string;
    text: string;
    receiverInfo: Partial<UserType>;
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
    receiverSocketId: string;
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
    messageId: string;
    reaction: {
        userId: string;
        emoji: string;
    };
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
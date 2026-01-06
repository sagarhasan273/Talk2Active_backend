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

export interface GroupMessageData {
    roomId: string;
    text: string;
    type: 'text' | 'system';
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

export interface PrivateMessageData {
    targetSocketId: string;
    message: string;
    name: string;
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
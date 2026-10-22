import { RoomParticipantResponse, RoomResponse } from "./chat.type";


export interface BroadcastNewRoomData {
    room: RoomResponse;
}

export interface BroadcastRoomUpdateData {
    room: Partial<RoomResponse> & { roomId: string };
}

export interface BroadcastUserJoinData {
    roomId: string;
    participant: RoomParticipantResponse;
}

export interface BroadcastUserLeaveData {
    roomId: string;
    participantId: string;
}

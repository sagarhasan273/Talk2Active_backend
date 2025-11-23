import { RoomBaseSchema, RoomCreateSchema, RoomResponseSchema } from "src/schemas/chat.schema";
import { z } from 'zod';

export type RoomBase = z.infer<typeof RoomBaseSchema>;
export type CreateRoomInput = z.infer<typeof RoomCreateSchema>;
export type RoomResponse = z.infer<typeof RoomResponseSchema>;
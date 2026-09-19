import { LanguageLevelEnum } from 'src/enums/chat.enum';
import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { ParticipantResponseSchema, UserResponseSchema } from './user.schema';

// ----------------------------------------------------------------------
// Reusable Sub-schemas
// ----------------------------------------------------------------------

export const DatePreprocessor = z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg as any) : arg),
    z.date()
);

// Base participant entry (user can be an unpopulated ObjectId or populated profile)
export const RoomParticipantBaseSchema = z.object({
    user: z.union([objectIdSchema, ParticipantResponseSchema]),
    joinedAt: DatePreprocessor,
    isHost: z.boolean().default(false),

});

// Populated participant entry (specifically returns ParticipantResponseSchema)
export const RoomParticipantResponseSchema = ParticipantResponseSchema.extend({
    joinedAt: DatePreprocessor,
    isHost: z.boolean().default(false),
});

// ----------------------------------------------------------------------
// Room Schemas
// ----------------------------------------------------------------------

export const RoomBaseSchema = z.object({
    roomId: objectIdSchema,
    room_key: z.string().regex(/^RM[A-F0-9]{10}$/, {
        message: 'Room key must follow the format RMXXXXXXXXXX',
    }),
    topic: z.string().min(1, 'name is required'),
    welcome_message: z.string().optional().default('Welcome to the room!'),
    languages: z.array(z.string().min(1, 'languages is required')),
    level: z.nativeEnum(LanguageLevelEnum),
    max_participants: z.number().int().nonnegative().default(5),
    host: z.union([objectIdSchema, ParticipantResponseSchema]),
    participants: z.array(RoomParticipantBaseSchema).default([]),
    isActive: z.boolean().optional().default(true),
    kickedUserIds: z.array(objectIdSchema),

    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// Payload for creating rooms
export const RoomCreateSchema = RoomBaseSchema.pick({
    topic: true,
    welcome_message: true,
    languages: true,
    level: true,
    max_participants: true,
    host: true,
});

// Payload for updating rooms
export const RoomUpdateSchema = RoomBaseSchema.pick({
    topic: true,
    welcome_message: true,
    languages: true,
    level: true,
    max_participants: true,
    host: true,
    isActive: true,
})
    .partial()
    .extend({
        roomId: objectIdSchema,
    });

// Schema for populated API DB responses
export const RoomResponseSchema = RoomBaseSchema.extend({
    host: UserResponseSchema,
    participants: z.array(RoomParticipantResponseSchema).default([]),
});

// Stage actions
export const RoomJoinSchema = z.object({
    roomId: objectIdSchema,
    userId: objectIdSchema,
    isHost: z.boolean().default(false),
});

export const RoomLeaveSchema = z.object({
    roomId: objectIdSchema,
    userId: objectIdSchema,
    kicked: z.boolean().optional().default(false),
});

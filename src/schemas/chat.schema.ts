import { LanguageLevelEnum } from 'src/enums/chat.enum';
import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { UserBaseSchema } from './user.schema';

export const RoomBaseSchema = z.object({
    topic: z.string().min(1, "name is required"),
    welcome_message: z.string().optional().default('Welcome to the room!'),
    languages: z.array(z.string().min(1, "languages is required")),
    level: z.nativeEnum(LanguageLevelEnum),
    max_participants: z.number().int().nonnegative().optional().default(10),
    host: objectIdSchema,
    participants: z.array(
        z.object({
            user: objectIdSchema,
            joinedAt: z.preprocess(
                (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg as any) : arg),
                z.date()
            )
        })
    ).optional().default([]),
    isActive: z.boolean().optional().default(true),
    kickedUserIds: z.array(objectIdSchema)
});

// Schema to validate incoming create payloads (timestamps not expected)
export const RoomCreateSchema = RoomBaseSchema.pick({
    topic: true,
    welcome_message: true,
    languages: true,
    level: true,
    max_participants: true,
    host: true
});

export const RoomUpdateSchema = RoomBaseSchema.pick({
    topic: true,
    welcome_message: true,
    languages: true,
    level: true,
    max_participants: true,
    host: true,
    isActive: true,
}).partial().extend({
    roomId: objectIdSchema
});

// Schema to validate objects returned from DB (includes mongoose timestamps)
export const RoomResponseSchema = RoomBaseSchema.extend({
    _id: objectIdSchema,
    host: UserBaseSchema,
    participants: z
        .array(
            z.object({
                user: UserBaseSchema,
                joinedAt: z.preprocess(
                    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg as any) : arg),
                    z.date()
                ),
            })
        )
        .optional()
        .default([]),
    createdAt: z.preprocess((arg) => new Date(arg as any), z.date()),
    updatedAt: z.preprocess((arg) => new Date(arg as any), z.date())
});



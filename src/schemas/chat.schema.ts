import { LanguageLevelEnum } from 'src/enums/chat.enum';
import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { UserSchema } from './user.schema';

export const RoomBaseSchema = z.object({
    name: z.string().min(1, "name is required"),
    description: z.string().min(1, "description is required"),
    languages: z.array(z.string().min(1, "language is required")),
    level: z.nativeEnum(LanguageLevelEnum),
    maxParticipants: z.number().int().nonnegative().optional().default(10),
    host: objectIdSchema,
    currentParticipants: z.array(
        z.object({
            user: objectIdSchema,
            joinedAt: z.preprocess(
                (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg as any) : arg),
                z.date()
            )
        })
    ).optional().default([]),
    isActive: z.boolean().optional().default(true),
    roomType: z.string(),
});

// Schema to validate incoming create payloads (timestamps not expected)
export const RoomCreateSchema = RoomBaseSchema.pick({
    name: true,
    description: true,
    languages: true,
    level: true,
    maxParticipants: true,
    host: true,
    roomType: true
});

// Schema to validate objects returned from DB (includes mongoose timestamps)
export const RoomResponseSchema = RoomBaseSchema.extend({
    _id: objectIdSchema,
    host: UserSchema,
    currentParticipants: z
        .array(
            z.object({
                user: UserSchema,
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



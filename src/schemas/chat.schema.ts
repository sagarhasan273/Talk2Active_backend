import { LanguageLevelEnum, ModerationModeEnum } from 'src/enums/chat.enum';
import { z } from 'zod';
import { objectIdSchema } from './base.schema';
import { UserSchema } from './user.schema';

export const RoomBaseSchema = z.object({
    name: z.string().min(1, "name is required"),
    description: z.string().min(1, "description is required"),
    language: z.string().min(1, "language is required"),
    level: z.nativeEnum(LanguageLevelEnum),
    maxParticipants: z.number().int().nonnegative().optional().default(10),
    public: z.boolean().optional().default(true),
    password: z.string().max(4).optional(),
    pushToTalk: z.boolean().optional().default(false),
    noiseSuppression: z.boolean().optional().default(true),
    echoCancellation: z.boolean().optional().default(true),
    autoGainControl: z.boolean().optional().default(true),
    maxSimutaneousSpeakers: z.number().int().nonnegative().optional().default(10),
    moderationMode: z.nativeEnum(ModerationModeEnum).optional().default('open'),
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
    tags: z.array(z.string()).optional(), // empty array allowed
    roomType: z.array(z.string()).optional(),
});

// Schema to validate incoming create payloads (timestamps not expected)
export const RoomCreateSchema = RoomBaseSchema.pick({
    name: true,
    description: true,
    language: true,
    level: true,
    maxParticipants: true,
    public: true,
    password: true,
    pushToTalk: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    maxSimutaneousSpeakers: true,
    moderationMode: true,
    host: true,
    tags: true,
}).superRefine((data, ctx) => {
    // If public === false → password is required
    if (data.public === false && !data.password) {
        ctx.addIssue({
            path: ["password"],
            code: z.ZodIssueCode.custom,
            message: "Password is required when room is not public."
        });
    }
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



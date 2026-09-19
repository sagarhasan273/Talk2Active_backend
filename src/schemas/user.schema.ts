// schemas/user.schema.ts
import { z as zod } from 'zod';
import { objectIdSchema } from './base.schema';

// ----------------------------------------------------------------------
// Reusable Sub-Schemas
// ----------------------------------------------------------------------

export const DatePreprocessor = zod.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg as any) : arg),
    zod.date()
);

export const SocialLinksSchema = zod.object({
    facebook: zod.string().url({ message: 'Invalid Facebook URL' }).or(zod.literal('')).optional(),
    twitter: zod.string().url({ message: 'Invalid Twitter URL' }).or(zod.literal('')).optional(),
    instagram: zod.string().url({ message: 'Invalid Instagram URL' }).or(zod.literal('')).optional(),
    linkedin: zod.string().url({ message: 'Invalid LinkedIn URL' }).or(zod.literal('')).optional(),
}).strict();

export const BlockedUserSchema = zod.object({
    userId: objectIdSchema,
    createdAt: DatePreprocessor.default(() => new Date()),
    reason: zod.string().optional(),
});

// ----------------------------------------------------------------------
// Main User Schema
// ----------------------------------------------------------------------

export const UserBaseSchema = zod.object({
    userId: objectIdSchema,
    genUserId: zod.string().regex(/^USR[A-F0-9]{10}$/, {
        message: 'User ID must follow the format USRXXXXXXXXXX',
    }),
    googleId: zod.string().optional(),
    username: zod
        .string()
        .min(3, { message: 'Username must be at least 3 characters' })
        .max(30, { message: 'Username cannot exceed 30 characters' })
        .regex(/^[a-zA-Z0-9_]+$/, {
            message: 'Username can only contain letters, numbers, and underscores',
        })
        .optional(),
    email: zod
        .string()
        .email({ message: 'Invalid email address' })
        .min(1, { message: 'Email is required' }),
    profilePhoto: zod
        .string()
        .url({ message: 'Invalid URL for profile photo' })
        .nullable()
        .optional(),
    bio: zod.string().max(500, { message: 'Bio cannot exceed 500 characters' }).optional().default(''),
    name: zod
        .string()
        .min(2, { message: 'Full name must be at least 2 characters' })
        .max(100, { message: 'Full name cannot exceed 100 characters' })
        .optional(),
    password: zod
        .string()
        .min(1, { message: 'Password is required' })
        .regex(/^\$argon2[id]?d?\$v=\d+\$m=\d+,t=\d+,p=\d+\$[a-zA-Z0-9+/]+\$[a-zA-Z0-9+/]+/, {
            message: 'Password must be a valid Argon2 hash',
        })
        .optional(),
    lastActive: DatePreprocessor.optional().default(() => new Date()),
    verified: zod.boolean().default(false),
    accountType: zod.enum(['admin', 'supporter', 'vip', 'moderator', 'member']).default('member'),
    follower_count: zod.number().int().nonnegative().default(0),
    following_count: zod.number().int().nonnegative().default(0),
    friend_count: zod.number().int().nonnegative().default(0),
    pendingRequests: zod.number().int().nonnegative().default(0),

    createdAt: DatePreprocessor.optional(),
    updatedAt: DatePreprocessor.optional(),
}).strict();

// ----------------------------------------------------------------------
// Response & Action Schemas
// ----------------------------------------------------------------------

export const UserResponseSchema = UserBaseSchema.pick({
    userId: true,
    genUserId: true,
    name: true,
    username: true,
    email: true,
    profilePhoto: true,
    bio: true,
    lastActive: true,
    verified: true,
    accountType: true,
    follower_count: true,
    following_count: true,
    friend_count: true,
    pendingRequests: true,
    createdAt: true,
    updatedAt: true,
});

export const CreateUserSchema = UserBaseSchema.pick({
    username: true,
    email: true,
    name: true,
}).extend({
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const LogInUserSchema = UserBaseSchema.pick({
    email: true,
}).extend({
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const UpdateUserSchema = UserBaseSchema.pick({
    genUserId: true,
    username: true,
    email: true,
    name: true,
    profilePhoto: true,
    bio: true,
})
    .partial()
    .extend({
        userId: objectIdSchema,
    });

export const UserAccountUpdateSchema = UserBaseSchema.pick({
    username: true,
    genUserId: true,
}).extend({
    userId: objectIdSchema,
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
    newPassword: zod.string().min(8, { message: 'New password must be at least 8 characters' }),
});

// Stage/Room Participant Profile
export const HostResponseSchema = UserBaseSchema.pick({
    userId: true,
    genUserId: true,
    name: true,
    username: true,
    profilePhoto: true,
    bio: true,
    verified: true,
    accountType: true,
    follower_count: true,
    following_count: true,
    friend_count: true,
}).extend({
    isFollowing: zod.boolean().default(false),
    isBlocked: zod.boolean().default(false),
});

export const ParticipantResponseSchema = UserBaseSchema.pick({
    userId: true,
    genUserId: true,
    name: true,
    username: true,
    profilePhoto: true,
    bio: true,
    verified: true,
    accountType: true,
    follower_count: true,
    following_count: true,
    friend_count: true,
}).extend({
    isFollowing: zod.boolean().default(false),
    isBlocked: zod.boolean().default(false),
});

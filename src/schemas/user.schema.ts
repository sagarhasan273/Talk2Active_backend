// schemas/user.schema.ts
import { PostTagsEnum } from 'src/enums/post.enum';
import { z as zod } from 'zod';
import { objectIdSchema } from './base.schema';



// Social Links Sub-Schema
export const SocialLinksSchema = zod.object({
    facebook: zod.string().url({ message: 'Invalid Facebook URL' }).or(zod.literal('')).optional(),
    twitter: zod.string().url({ message: 'Invalid Twitter URL' }).or(zod.literal('')).optional(),
    instagram: zod.string().url({ message: 'Invalid Instagram URL' }).or(zod.literal('')).optional(),
    linkedin: zod.string().url({ message: 'Invalid LinkedIn URL' }).or(zod.literal('')).optional(),
}).strict();

export const BlockedUserSchema = zod.object({
    userId: objectIdSchema,
    createdAt: zod.date().default(() => new Date()),
    reason: zod.string().optional(),
});

// Main User Schema
export const UserSchema = zod.object({
    id: objectIdSchema,
    userId: zod.string().regex(/^USR\d{6}\d{4}$/, {
        message: 'User ID must follow the format USRYYMMDDCOUNTER',
    }),
    googleId: zod.string(),
    username: zod
        .string()
        .min(3, { message: 'Username must be at least 3 characters' })
        .max(30, { message: 'Username cannot exceed 30 characters' })
        .regex(/^[a-zA-Z0-9_]+$/, {
            message: 'Username can only contain letters, numbers, and underscores',
        }).optional(),
    email: zod
        .string()
        .email({ message: 'Invalid email address' })
        .min(1, { message: 'Email is required' }),
    profilePhoto: zod
        .string()
        .url({ message: 'Invalid URL for profile photo' }),
    coverPhoto: zod
        .string()
        .url({ message: 'Invalid URL for cover photo' }),
    bio: zod.string().max(500, { message: 'Bio cannot exceed 500 characters' }),
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
        }).optional(),
    dateOfBirth: zod
        .date()
        .max(new Date(), { message: 'Date of birth cannot be in the future' })
        .optional(),
    gender: zod
        .enum(['male', 'female', 'other', 'prefer-not-to-say']),
    lastActive: zod
        .union([zod.string().datetime(), zod.date()])
        .transform((val) => new Date(val)),
    status: zod
        .enum(['online', 'offline', 'busy', 'brb', 'afk', 'zzz']),
    verified: zod.boolean(),
    accountActive: zod.boolean(),
    sessionTimeOut: zod.number().int().nonnegative(),

    accountType: zod
        .enum(['admin', 'supporter', 'member']),

    followerCount: zod.number().int().nonnegative(),
    followingCount: zod.number().int().nonnegative(),
    friendCount: zod.number().int().nonnegative(),
    pendingRequests: zod.number().int().nonnegative(),

    postCount: zod.number().int().nonnegative(),

    location: zod.string().max(100, { message: 'Location cannot exceed 100 characters' }),
    website: zod.string().url({ message: 'Invalid website URL' }).or(zod.literal('')).optional(),
    socialLinks: SocialLinksSchema.optional(),
    blockedUsers: zod.array(BlockedUserSchema).optional(),
    profileVisibility: zod.enum(['public', 'private', 'friends-only']).default('public'),
    allowMessagesFrom: zod.enum(['everyone', 'friends', 'no-one']).default('everyone'),
    showActivityStatus: zod.boolean().default(true),
    showReadReceipts: zod.boolean().default(true),
    showLastSeen: zod.boolean().default(true),
    createdAt: zod.date().optional(),
    updatedAt: zod.date().optional(),

    // categories
    tags: zod.array(zod.enum(Object.values(PostTagsEnum) as [string, ...string[]]))
        .max(30, "Cannot have more than 30 tags")
        .default([]),

    recentRooms: zod.array(zod.object({
        room: zod.string(),
        joinedAt: zod.date()
    })).optional()
}).strict();

// Derived Schemas
export const CreateUserSchema = UserSchema.pick({
    username: true,
    email: true,
    name: true,
}).extend({
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const LogInUserSchema = UserSchema.pick({
    email: true,
}).extend({
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export const UpdateUserSchema = UserSchema.pick({
    id: true,
    userId: true,
    username: true,
    email: true,
    name: true,
    profilePhoto: true,
    coverPhoto: true,
    bio: true,
    // dateOfBirth: true,
    location: true,
    status: true,
    website: true,
    tags: true,
    recentRooms: true,
}).partial().required({
    id: true,
});

export const UpdateUserRecentRoomsSchema = UserSchema.pick({
    id: true,
}).partial().required({
    id: true,
}).extend({
    roomId: zod.string()
});

export const UserAccountUpdateSchema = UserSchema.pick({
    id: true,
    userId: true,
    username: true,
}).extend({
    password: zod.string().min(8, { message: 'Password must be at least 8 characters' }),
    newPassword: zod.string().min(8, { message: 'New password must be at least 8 characters' })
})

export const UserAccountActivateSchema = UserSchema.pick({
    id: true,
    accountActive: true,
}).required({ id: true })

export const UserAccountSessionSchema = UserSchema.pick({
    id: true,
    sessionTimeOut: true,
}).required({ id: true })

export const ParticipantUserSchema = UserSchema.pick({
    id: true,
    userId: true,
    username: true,
    email: true,
    name: true,
    profilePhoto: true,
    coverPhoto: true,
    bio: true,
    // dateOfBirth: true,
    location: true,
    status: true,
    website: true,
    tags: true,
}).partial().required({
    id: true,
}).extend({ roomId: zod.string() });



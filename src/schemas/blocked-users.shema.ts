import { z } from "zod";

export const BlockedUserSchema = z.object({
    blockerId: z.string().refine((val) => {
        return /^[0-9a-fA-F]{24}$/.test(val); // Validate MongoDB ObjectId
    }, {
        message: "Invalid blockerId, must be a MongoDB ObjectId"
    }),
    blockedId: z.string().refine((val) => {
        return /^[0-9a-fA-F]{24}$/.test(val); // Validate MongoDB ObjectId
    }, {
        message: "Invalid blockedId, must be a MongoDB ObjectId"
    }),
    createdAt: z.date().default(() => new Date()),
    reason: z.string().optional()
});

export type BlockedUser = z.infer<typeof BlockedUserSchema>;
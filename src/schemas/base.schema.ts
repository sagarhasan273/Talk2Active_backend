// schemas/user.schema.ts
import { ObjectId } from 'mongodb';
import { z as zod } from 'zod';


// Helper schema for MongoDB ObjectId
export const objectIdSchema = zod.union([
    zod.string().transform((val, ctx) => {
        try {
            return new ObjectId(val);
        } catch (error) {
            ctx.addIssue({
                code: zod.ZodIssueCode.custom,
                message: 'Invalid ObjectId',
            });
            return zod.NEVER;
        }
    }),
    zod.instanceof(ObjectId),
    zod.string(),
]);
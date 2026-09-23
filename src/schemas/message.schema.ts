import { SystemType } from 'src/enums/social.enum';
import { z } from 'zod';

export const CreateMessageSchema = z.object({
    id: z.string().optional(),
    recipientId: z.string().min(1),
    text: z.string().min(1).max(2000),
    replyToId: z.string().optional(),
    isSystem: z.boolean().optional(),
    systemType: z.nativeEnum(SystemType).optional(),
});

export const UpdateMessageSchema = z.object({
    text: z.string().min(1).max(2000),
});

export const ReactionSchema = z.object({
    emoji: z.string().min(1),
});

export type CreateMessageDto = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageDto = z.infer<typeof UpdateMessageSchema>;
export type ReactionDto = z.infer<typeof ReactionSchema>;
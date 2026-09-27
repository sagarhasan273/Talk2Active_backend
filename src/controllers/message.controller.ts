import { Request, Response } from 'express';
import {
    CreateMessageSchema,
    ReactionSchema,
    UpdateMessageSchema,
} from 'src/schemas/message.schema';
import { JwtService } from 'src/services/auth/jwt.service';
import { MessageService } from 'src/services/message.service';

export class MessageController {
    private static extractUserId(req: Request): string | undefined {
        if (req.user?.userId) return req.user.userId;
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = JwtService.verifyToken(token);
                return decoded?.userId;
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    public static async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const currentUserId = MessageController.extractUserId(req);
            if (!currentUserId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { targetUserId } = req.params;
            const messages = await MessageService.getHistory(currentUserId, targetUserId);
            res.status(200).json({ success: true, data: messages });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    public static async saveMessage(req: Request, res: Response): Promise<void> {
        try {
            const currentUserId = MessageController.extractUserId(req) || req.body?.userId;
            if (!currentUserId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const parsed = CreateMessageSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.flatten() });
                return;
            }

            const currentUserName =
                (req.user as any)?.name ||
                (req.user as any)?.username ||
                parsed.data.authorName ||
                'User';

            const message = await MessageService.saveMessage(
                currentUserId,
                currentUserName,
                parsed.data
            );
            res.status(201).json({ success: true, data: message });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    public static async updateMessage(req: Request, res: Response): Promise<void> {
        try {
            const currentUserId = MessageController.extractUserId(req);
            const { messageId } = req.params;
            if (!currentUserId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const parsed = UpdateMessageSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.flatten() });
                return;
            }

            const updated = await MessageService.editMessage(
                messageId,
                currentUserId,
                parsed.data.text
            );
            res.status(200).json({ success: true, data: updated });
        } catch (err: any) {
            const status =
                err.message === 'NOT_FOUND' ? 404 : err.message === 'FORBIDDEN' ? 403 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    public static async toggleReaction(req: Request, res: Response): Promise<void> {
        try {
            const currentUserId = MessageController.extractUserId(req);
            const { messageId } = req.params;
            if (!currentUserId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const parsed = ReactionSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.flatten() });
                return;
            }

            const updated = await MessageService.toggleReaction(
                messageId,
                currentUserId,
                parsed.data.emoji
            );
            res.status(200).json({ success: true, data: updated });
        } catch (err: any) {
            const status = err.message === 'NOT_FOUND' ? 404 : 500;
            res.status(status).json({ error: err.message });
        }
    }

    public static async readMessages(req: Request, res: Response): Promise<void> {
        try {
            const { userId1, userId2 } = req.params;
            const currentUserId = MessageController.extractUserId(req) || userId1;

            if (!currentUserId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const targetUserId = String(currentUserId) === String(userId1) ? userId2 : userId1;

            await MessageService.markAsRead(currentUserId, targetUserId);

            res.status(200).json({
                success: true,
                message: 'Messages marked as read',
                data: null,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
}
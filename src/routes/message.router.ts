

import { MessageController } from 'src/controllers/message.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class MessageRouter extends BaseRouter {
    protected routes(): void {
        this.router.get('/history/:targetUserId', authMiddleware, MessageController.getHistory);
        this.router.post('/save', authMiddleware, MessageController.saveMessage);
        this.router.patch('/:messageId', authMiddleware, MessageController.updateMessage);
        this.router.post('/:messageId/reactions', authMiddleware, MessageController.toggleReaction);
        this.router.post('/:userId1/:userId2/read', MessageController.readMessages);
    }
}
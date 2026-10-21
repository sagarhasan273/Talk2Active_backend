import { MessageController } from 'src/controllers/message.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class MessageRouter extends BaseRouter {
  private messageController = new MessageController();

  protected routes(): void {
    this.router.get('/unread', authMiddleware, (req, res) => this.messageController.getUnreadSummary(req, res));
    this.router.get('/history/:targetUserId', authMiddleware, (req, res) => this.messageController.getHistory(req, res));
    this.router.post('/save', authMiddleware, (req, res) => this.messageController.saveMessage(req, res));
    this.router.patch('/:messageId', authMiddleware, (req, res) => this.messageController.updateMessage(req, res));
    this.router.post('/:messageId/reactions', authMiddleware, (req, res) => this.messageController.toggleReaction(req, res));
    this.router.post('/:userId1/:userId2/read', authMiddleware, (req, res) => this.messageController.readMessages(req, res));
  }
}
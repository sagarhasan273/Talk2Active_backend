

import { MessageController } from 'src/controllers/message.controller';
import { BaseRouter } from './base.router';

export class MessageRouter extends BaseRouter {
    private messageController = new MessageController();

    protected routes(): void {
        this.router.get('/:userId1/:userId2', (req, res) =>
            this.messageController.getConversation(req, res)
        );
    }
}
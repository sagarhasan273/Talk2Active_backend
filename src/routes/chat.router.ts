import { ChatController } from 'src/controllers/chat.controller';
import { BaseRouter } from './base.router';

export class ChatRouter extends BaseRouter {
    private chatController = new ChatController();

    protected routes(): void {
        this.router.get('/list', (req, res) =>
            this.chatController.getRooms(req, res)
        );
        this.router.get('/:roomId', (req, res) =>
            this.chatController.getRoomById(req, res)
        );
        this.router.post('/create', (req, res) => {
            return this.chatController.createRoom(req, res)
        });
        this.router.post('/update', (req, res) =>
            this.chatController.updateRoom(req, res)
        );
        this.router.post('/:roomId/join', (req, res) =>
            this.chatController.joinRoom(req, res)
        );
        this.router.post('/:roomId/leave', (req, res) =>
            this.chatController.leaveRoom(req, res)
        );
    }
}
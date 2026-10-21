
import express from 'express';
import { LiveKitWebhookController } from 'src/controllers/live-kit.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class LiveKitRouter extends BaseRouter {
    private liveKitController = new LiveKitWebhookController();

    protected routes(): void {
        this.router.post('/:roomId/join-request', authMiddleware, (req, res) =>
            this.liveKitController.joinRoomRequest(req, res)
        );
        this.router.post(
            '/webhooks',
            express.raw({ type: 'application/webhook+json' }),
            (req, res) => this.liveKitController.handleLiveKitWebhook(req, res));
    }
}


import express from 'express';
import { LiveKitWebhookController } from 'src/controllers/live-kit.controller';
import { BaseRouter } from './base.router';

export class LiveKitRouter extends BaseRouter {
    private liveKitController = new LiveKitWebhookController();

    protected routes(): void {
        this.router.post(
            '/livekit',
            express.raw({ type: 'application/webhook+json' }),
            (req, res) => this.liveKitController.handleLiveKitWebhook(req, res));
    }
}

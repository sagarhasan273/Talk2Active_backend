// src/controllers/livekit-webhook.controller.ts
import { Request, Response } from 'express';
import { ChatService } from 'src/services/chat.service';
import { LiveKitService } from 'src/services/livekit.service';
import { socketService } from 'src/socket';
import logger from 'src/utils/logger';

export class LiveKitWebhookController {
    private chatService = new ChatService();
    private livekitService = new LiveKitService();

    public handleLiveKitWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            const receiver = this.livekitService.getWebhookReceiver();
            const authHeader = req.get('Authorization');

            logger.info('Live-kit-webhook');

            if (!authHeader) {
                logger.error("Authorization Failed");
                res.status(401).json({ status: false, message: 'Missing Authorization header' });
                return;
            }

            // 1. Strictly convert incoming payload to raw UTF-8 string
            let rawBody: string;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body.toString('utf-8');
            } else if (typeof req.body === 'string') {
                rawBody = req.body;
            } else {
                // If another middleware converted it to JSON, fallback to stringifying
                rawBody = JSON.stringify(req.body);
            }

            // 2. Validate HMAC signature and parse event
            const event = await receiver.receive(rawBody, authHeader);

            // 3. Handle participant leaving
            if (event.event === 'participant_left') {
                const roomId = event.room?.name;
                const userId = event.participant?.identity;

                if (roomId && userId) {
                    logger.info(`[LiveKit Webhook] Participant left: ${userId} from ${roomId}`);

                    await this.chatService.leaveRoom({
                        roomId,
                        userId,
                        kicked: false,
                    });

                    socketService.emitBroadcastUserLeave({
                        roomId: roomId.toString(),
                        participantId: userId,
                    });
                }
            }

            // Always reply 200 OK so LiveKit knows the webhook succeeded
            res.status(200).json({ status: true, message: 'Webhook processed' });
        } catch (error) {
            logger.error('[LiveKit Webhook Error]:', error);
            res.status(400).json({ status: false, message: 'Webhook validation failed' });
        }
    };
}
import { Request, Response } from 'express';
import mongoose from 'mongoose';
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

            if (!authHeader) {
                logger.error('Authorization Failed');
                res.status(401).json({ status: false, message: 'Missing Authorization header' });
                return;
            }

            // 1. Convert incoming payload to raw UTF-8 string
            let rawBody: string;
            if (Buffer.isBuffer(req.body)) {
                rawBody = req.body.toString('utf-8');
            } else if (typeof req.body === 'string') {
                rawBody = req.body;
            } else {
                rawBody = JSON.stringify(req.body);
            }

            // 2. Validate HMAC signature and parse event
            const event = await receiver.receive(rawBody, authHeader);

            // 3. Handle participant leaving
            if (event.event === 'participant_left') {
                let roomId = event.room?.name;
                let userId = event.participant?.identity;

                // Fallback: Check attributes/metadata if identity/name was a display name
                if (event.participant?.attributes?.roomId) {
                    roomId = event.participant.attributes.roomId;
                }

                logger.info(`[LiveKit Webhook] Participant left: ${userId} from room: ${roomId}`);

                // Guard: Only hit the database if roomId and userId are valid MongoDB ObjectIds
                const isValidObjectId = (id?: string) => Boolean(id && mongoose.Types.ObjectId.isValid(id));

                if (isValidObjectId(roomId) && isValidObjectId(userId)) {
                    try {
                        await this.chatService.leaveRoom({
                            roomId: roomId!,
                            userId: userId!,
                            kicked: false,
                        });
                    } catch (dbError) {
                        logger.error('[LiveKit Webhook] DB error on leaveRoom:', dbError);
                    }
                } else {
                    logger.warn(
                        `[LiveKit Webhook] Skipping DB leaveRoom: non-ObjectId received (roomId: ${roomId}, userId: ${userId})`
                    );
                }

                // Still broadcast socket leave event to frontend listeners
                if (roomId && userId) {
                    socketService.emitBroadcastUserLeave({
                        roomId: roomId.toString(),
                        participantId: userId.toString(),
                    });
                }
            }

            // Always reply 200 OK so LiveKit does not spam retry requests
            res.status(200).json({ status: true, message: 'Webhook processed' });
        } catch (error) {
            logger.error('[LiveKit Webhook Error]:', error);
            res.status(400).json({ status: false, message: 'Webhook validation failed' });
        }
    };
}
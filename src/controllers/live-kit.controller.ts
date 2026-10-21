// src/controllers/livekit-webhook.controller.ts

import { Request, Response } from 'express';
import { RoomJoinSchema } from 'src/schemas/chat.schema';
import { ChatService } from 'src/services/chat.service';
import { liveKitService } from 'src/services/livekit.service'; // Use the shared singleton instance
import logger from 'src/utils/logger';

export class LiveKitWebhookController {
  private chatService = new ChatService();

  public joinRoomRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomId } = req.params;
      const userId = req.user?.userId || req.body.userId;

      const validatedInput = RoomJoinSchema.parse({ roomId, userId });

      const { token } = await liveKitService.joinRoomRequest(validatedInput);
      const room = await this.chatService.getRoomById(roomId);

      res.status(200).json({
        status: true,
        message: 'Joined room successfully',
        data: {
          roomId: validatedInput.roomId,
          token,
          room
        },
      });
    } catch (error) {
      logger.error('[LiveKit Join Request Error]:', error);
      res.status(400).json({ status: false, message: 'Join room request validation failed' });
    }
  };

  public handleLiveKitWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.get('Authorization');

      if (!authHeader) {
        logger.error('Authorization Failed');
        res.status(401).json({ status: false, message: 'Missing Authorization header' });
        return;
      }

      let rawBody: string;
      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf-8');
      } else if (typeof req.body === 'string') {
        rawBody = req.body;
      } else {
        rawBody = JSON.stringify(req.body);
      }

      await liveKitService.handleLiveKitWebhook(rawBody, authHeader);

      res.status(200).json({ status: true, message: 'Webhook processed' });
    } catch (error) {
      logger.error('[LiveKit Webhook Error]:', error);
      res.status(400).json({ status: false, message: 'Webhook validation failed' });
    }
  };
}

import { Request, Response } from 'express';
import { UserMessage } from 'src/models/message.model';
import { MessageService } from 'src/services/message.service';
import { getSocketHandler, MessageHandler } from 'src/socket/setup-handler.socket';


export class MessageController {
    private messageService = new MessageService();
    private messageHandler: MessageHandler;

    constructor() {
        this.messageHandler = getSocketHandler().getMessageHandler();
    }

    sendMessage = async (req: Request, res: Response) => {
        try {
            const { senderId, receiverId, text, isPrivate } = req.body;

            const conversationId = this.messageService.generateConversationId(senderId, receiverId);

            if (typeof text !== 'string') {
                return res.status(400).json({ success: false, message: 'Text is required and must be a string.' });
            }

            const messageData: Partial<UserMessage> = {
                text,
                sender: 'me', // This would be determined by your auth system
                time: req.body.time,
                isUnread: true,
                isPrivate: isPrivate || false,
                type: 'message',
                senderInfo: req.body.senderInfo,
                targetUserInfo: req.body.targetUserInfo,
                conversationId,
                isReply: req.body.parentMessageId ? true : false,
                parentMessageId: req.body.parentMessageId,
            };

            await this.messageService.saveMessage(messageData);

            this.messageHandler.handleIndividualMessage(messageData as any);

            res.status(201).json({ success: true, message: 'Message sent successfully' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({ message: errorMessage });
        }
    };

    getConversation = async (req: Request, res: Response) => {
        try {
            const { userId1, userId2 } = req.params;
            const { limit, before } = req.query;

            const messages = await this.messageService.getMessages(
                userId1,
                userId2,
                parseInt(limit as string) || 50,
                before ? new Date(before as string) : undefined
            );

            res.json({ success: true, messages });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({ message: errorMessage });
        }
    };

    deleteMessage = async (req: Request, res: Response) => {
        try {
            const { messageId } = req.params;
            const userId = req.user.id; // From auth

            const deletedMessage = await this.messageService.deleteMessage(messageId, userId);

            if (!deletedMessage) {
                return res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
            }

            res.json({ success: true, message: deletedMessage });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({ message: errorMessage });
        }
    };
}
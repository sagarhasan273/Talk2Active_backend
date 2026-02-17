import { Request, Response } from 'express';
import { UserMessage } from 'src/models/message.model';
import { MessageService } from 'src/services/message.service';


export class MessageController {
    private messageService = new MessageService();

    constructor() { }

    sendMessage = async (req: Request, res: Response) => {
        try {
            const { senderId, receiverId, text, isPrivate } = req.body;

            const conversationId = this.messageService.generateConversationId(senderId, receiverId);

            if (typeof text !== 'string') {
                return res.status(400).json({ success: false, message: 'Text is required and must be a string.' });
            }

            const messageData: Partial<UserMessage> = {
                text,
                time: req.body.time,
                isUnread: true,
                type: 'message',
                senderInfo: req.body.senderInfo,
                receiverInfo: req.body.receiverInfo,
                conversationId,
                isReply: req.body.parentMessage ? true : false,
                parentMessage: req.body.parentMessage,
            };

            await this.messageService.saveMessage(messageData);

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

            res.json({ success: true, messages, chatUserId: userId2 });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({ message: errorMessage });
        }
    };

    readMessages = async (req: Request, res: Response) => {
        try {
            const { userId1, userId2 } = req.params;
            await this.messageService.readMessages(userId1, userId2);
            res.json({ success: true, message: 'Messages marked as read' });
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
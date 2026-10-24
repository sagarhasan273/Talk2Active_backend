import { ReadOnlyMiddleware } from 'src/middlewares/readonly-middleware';
import { FeedbackController } from '../controllers/feedback.controller';
import { authMiddleware, isAdmin } from '../middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class FeedbackRoutes extends BaseRouter {
    private controller = new FeedbackController();

    protected routes(): void {
        this.router.get('/get', ReadOnlyMiddleware, (req, res) => this.controller.getFeedbacks(req, res));
        this.router.use(authMiddleware);
        this.router.post('/create', (req, res) => this.controller.createFeedback(req, res));
        this.router.post('/update', (req, res) => this.controller.updateFeedback(req, res));
        this.router.put('/:feedbackId/react', (req, res) => this.controller.toggleReaction(req, res));
        this.router.delete('/:id', (req, res) => this.controller.deleteFeedback(req, res));
        this.router.patch('/:id/status', isAdmin, (req, res) => this.controller.updateStatus(req, res));
    }
}

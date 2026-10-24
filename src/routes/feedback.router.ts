import { FeedbackController } from '../controllers/feedback.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { BaseRouter } from './base.router';



export class FeedbackRoutes extends BaseRouter {
    private controller = new FeedbackController();

    protected routes(): void {
        this.router.use(authMiddleware);
        this.router.post('/create', (req, res) => this.controller.createFeedback(req, res));
        this.router.get('/get', (req, res) => this.controller.getFeedbacks(req, res));
        this.router.put('/:feedbackId/react', (req, res) => this.controller.toggleReaction(req, res));
    }
}

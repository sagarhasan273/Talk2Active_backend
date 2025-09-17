import { PostEngagementController } from "src/controllers/post-engagement.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class PostEngagementRoutes extends BaseRouter {
    private postEngagementController = new PostEngagementController();

    protected routes(): void {
        this.router.post('/like', authMiddleware, (req, res) => this.postEngagementController.likePost(req, res));

    }
}

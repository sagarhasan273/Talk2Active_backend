import { PostController } from "src/controllers/post.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class PostRoutes extends BaseRouter {
    private postController = new PostController();

    protected routes(): void {
        this.router.post('/create', authMiddleware, (req, res) => this.postController.createPost(req, res));
        this.router.get('/list', authMiddleware, (req, res) => this.postController.getPosts(req, res));
    }
}

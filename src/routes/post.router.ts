import { PostController } from "src/controllers/post.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class PostRoutes extends BaseRouter {
    private postController = new PostController();

    protected routes(): void {
        this.router.post('/create', authMiddleware, (req, res) => this.postController.createPost(req, res));
        this.router.post('/update', authMiddleware, (req, res) => this.postController.updatePost(req, res));
        this.router.delete('/delete', authMiddleware, (req, res) => this.postController.deletePost(req, res))
        this.router.get('/list', (req, res) => this.postController.getPosts(req, res));
        this.router.get('/list/profile', authMiddleware, (req, res) => this.postController.getPostsByUserId(req, res));
    }
}


import { UserSuggestionController } from "src/controllers/user-suggestion.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class UserSuggestionRoutes extends BaseRouter {
    private userSuggestionController = new UserSuggestionController();

    protected routes(): void {
        this.router.get('/new-users/:userId', authMiddleware, (req, res) => this.userSuggestionController.getNewUsersSuggestions(req, res));
    }
}

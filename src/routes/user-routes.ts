import { UserController } from 'src/controllers/user.controller';
import { BaseRouter } from './base-router';

export class UserRoutes extends BaseRouter {
  private userController = new UserController();

  protected routes(): void {
    this.router.post('/auth/sign-in', (req, res) => this.userController.getUserByEmail(req, res));
    this.router.get('/u/me', (req, res) => this.userController.getUser(req, res));
    this.router.post('/auth/sign-up', (req, res) => this.userController.createUser(req, res));
  }
}

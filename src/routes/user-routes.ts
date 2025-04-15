import { UserController } from '../controllers/user-controller';
import { BaseRouter } from './base-router';

export class UserRoutes extends BaseRouter {
  private userController = new UserController();

  protected routes(): void {
    this.router.post('/users', (req, res) => this.userController.createUser(req, res));
    this.router.get('/users/:id', (req, res) => this.userController.getUserById(req, res));
  }
}

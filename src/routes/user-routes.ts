import { UserController } from 'src/controllers/user.controller';
import { BaseRouter } from './base-router';

export class UserRoutes extends BaseRouter {
  private userController = new UserController();

  protected routes(): void {
    this.router.get('/user/login', (req, res) => this.userController.getUserByEmail(req, res));
    this.router.get('/user/:id', (req, res) => this.userController.getUserById(req, res));
    this.router.post('/user/create', (req, res) => this.userController.createUser(req, res));
  }
}

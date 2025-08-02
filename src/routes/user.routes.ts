import { UserController } from 'src/controllers/user.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class UserRoutes extends BaseRouter {
  private userController = new UserController();

  protected routes(): void {
    this.router.post('/auth/sign-in', (req, res, next) => this.userController.logInUser(req, res));
    this.router.post('/auth/sign-up', (req, res) => this.userController.createUser(req, res));
    this.router.get('/u/me', authMiddleware, (req, res) => this.userController.getUser(req, res));
    this.router.get('/profile/:id', authMiddleware, (req, res) =>
      this.userController.getUserById(req, res)
    );
    this.router.post('/profile/update', authMiddleware, (req, res) =>
      this.userController.updateUser(req, res)
    );
    this.router.post('/profile/update/activate', authMiddleware, (req, res) =>
      this.userController.updateUserAccountActivate(req, res)
    );
    this.router.post('/account/update', authMiddleware, (req, res) =>
      this.userController.updateUserAccount(req, res)
    );
    this.router.post('/profile/update/session', authMiddleware, (req, res) =>
      this.userController.updateUserAccountSession(req, res)
    );
  }
}

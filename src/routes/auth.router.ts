import { AuthController } from 'src/controllers/auth.controller';
import { BaseRouter } from './base.router';

export class AuthRoutes extends BaseRouter {
    private authController = new AuthController();

    protected routes(): void {
        this.router.post('/google', (req, res) => this.authController.googleLogin(req, res));
        this.router.post('/google/mobile', (req, res) => this.authController.googleLoginMobile(req, res))
    }
}

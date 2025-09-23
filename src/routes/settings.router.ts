import { SettingsController } from "src/controllers/settings.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class SettingRoutes extends BaseRouter {
    private settingsController = new SettingsController();

    protected routes(): void {
        this.router.post('/privacy', authMiddleware, (req, res) => this.settingsController.updateUserPrivacySettings(req, res));
        this.router.post('/notification', authMiddleware, (req, res) => this.settingsController.updateUserNotificationSettings(req, res))
        this.router.post('/appearance', authMiddleware, (req, res) => this.settingsController.updateUserAppearanceSettings(req, res))
    }
}

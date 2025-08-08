import { SettingsRepository } from "src/repositories/setttings.repository";
import { UpdateUserAppearanceInput, UpdateUserNotificationInput, UpdateUserPrivacyInput } from "src/types/settings.type";
import { AppError } from "src/utils/errors";


export class SettingsService {
    private repository = new SettingsRepository();

    public async updateUserPrivacySettings(input: UpdateUserPrivacyInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedSettings = await this.repository.updateUserPrivacySettings(input);
            return updatedSettings;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Service');
        }
    }

    public async updateUserNotificationSettings(input: UpdateUserNotificationInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedSettings = await this.repository.updateUserNotificationSettings(input);
            return updatedSettings;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user notification settings!', 500, 'Settings Service');
        }
    }

    public async updateUserAppearanceSettings(input: UpdateUserAppearanceInput): Promise<any> {
        try {
            // Validate and sanitize settings input here if necessary
            const updatedSettings = await this.repository.updateUserAppearanceSettings(input);
            return updatedSettings;
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user Appearance settings!', 500, 'Settings Service');
        }
    }
}
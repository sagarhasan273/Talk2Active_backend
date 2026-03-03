import { Request, Response } from 'express';
import { UpdateUserPrivacySchema } from "src/schemas/settings.schema";
import { SettingsService } from 'src/services/settings.service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class SettingsController {
    private service = new SettingsService();

    public async updateUserPrivacySettings(req: Request, res: Response): Promise<void> {
        let validatedInput;
        try {
            validatedInput = UpdateUserPrivacySchema.parse(req.body);
        } catch (error) {
            logger.error('Invalid privacy data!');
            res.status(400).json({ status: false, message: 'Invalid privacy data!' });
            return;
        }

        try {
            await this.service.updateUserPrivacySettings(validatedInput);
            res.status(200).json({ status: true, message: 'Privacy settings updated successfully' });
        } catch (error) {
            if (error instanceof AppError) {
                logger.error(`${error.at}: ${error.message}`);
                res.status(error.statusCode).json({ message: error.message, status: false });
                return;
            }

            logger.error('An error occurred while updating privacy settings!');
            res.status(500).json({ message: 'An error occurred while updating privacy settings!', status: false });
        }
    }
}
import { ObjectId } from 'mongodb';
import { UserModel } from "src/models/user.model";
import { ReturnResponseType } from "src/types/base.type";
import { UpdateUserAppearanceInput, UpdateUserNotificationInput, UpdateUserPrivacyInput } from "src/types/settings.type";
import { AppError } from "src/utils/errors";


export class SettingsRepository {
    public async updateUserPrivacySettings(input: UpdateUserPrivacyInput): Promise<ReturnResponseType> {
        try {
            const { id, ...updatableFields } = input;

            const user = await UserModel.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        ...updatableFields,
                        updatedAt: new Date(),
                    },
                }
            );

            if (!user.modifiedCount) {
                throw new AppError('Failed to update user', 404, 'User Repository');
            }

            return { message: 'Privacy updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user privacy settings!', 500, 'Settings Repository');
        }
    }

    public async updateUserNotificationSettings(input: UpdateUserNotificationInput): Promise<ReturnResponseType> {
        try {
            const { id, ...updatableFields } = input;

            const user = await UserModel.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        ...updatableFields,
                        updatedAt: new Date(),
                    },
                }
            );

            if (!user.modifiedCount) {
                throw new AppError('Failed to update user notifications', 404, 'User Repository');
            }

            return { message: 'Notification updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user notification settings!', 500, 'Settings Repository');
        }
    }

    public async updateUserAppearanceSettings(input: UpdateUserAppearanceInput): Promise<ReturnResponseType> {
        try {
            const { id, ...updatableFields } = input;

            const user = await UserModel.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        ...updatableFields,
                        updatedAt: new Date(),
                    },
                }
            );

            if (!user.modifiedCount) {
                throw new AppError('Failed to update user Appearance', 404, 'User Repository');
            }

            return { message: 'Appearance updated successfully', status: true };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to update user Appearance settings!', 500, 'Settings Repository');
        }
    }
}
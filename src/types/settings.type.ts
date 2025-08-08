import { UpdateUserAppearanceSchema, UpdateUserNotificationSchema, UpdateUserPrivacySchema } from "src/schemas/settings.schema";
import { z as zod } from 'zod';

export type UpdateUserPrivacyInput = zod.infer<typeof UpdateUserPrivacySchema>;
export type UpdateUserNotificationInput = zod.infer<typeof UpdateUserNotificationSchema>
export type UpdateUserAppearanceInput = zod.infer<typeof UpdateUserAppearanceSchema>
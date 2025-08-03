import { z as zod } from 'zod';
import { UpdateUserPrivacySchema } from "src/schemas/settings.schema";

export type UpdateUserPrivacyInput = zod.infer<typeof UpdateUserPrivacySchema>;
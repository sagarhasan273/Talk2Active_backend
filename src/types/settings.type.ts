import { UpdateUserPrivacySchema } from "src/schemas/settings.schema";
import { z as zod } from 'zod';

export type UpdateUserPrivacyInput = zod.infer<typeof UpdateUserPrivacySchema>;

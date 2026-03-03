import { UserSchema } from "./user.schema";

export const UpdateUserPrivacySchema = UserSchema.pick({
    id: true,
    profileVisibility: true,
    allowMessagesFrom: true,
    showActivityStatus: true,
    showReadReceipts: true,
    showLastSeen: true,
}).required({
    id: true,
});
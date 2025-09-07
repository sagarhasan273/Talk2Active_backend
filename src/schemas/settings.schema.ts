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

export const UpdateUserNotificationSchema = UserSchema.pick({
    id: true,
    pushNotification: true,
    smsNotification: true,
    likesNotification: true,
    repostNotification: true,
    commentsNotification: true,
    newFollowersNotification: true,

    directMessage: true,
    roomInvitations: true,
    liveEvents: true,

    soundNotification: true,
    vibrationForNotification: true
}).required({
    id: true,
});

export const UpdateUserAppearanceSchema = UserSchema.pick({
    id: true,
    primaryColor: true,
    themeMode: true
}).required({
    id: true,
});
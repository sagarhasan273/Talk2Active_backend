// models/user.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { SocialLinks, UserType } from 'src/types/user.type';

// Social Links Sub-Schema
const SocialLinksSchema = new Schema<SocialLinks>({
  facebook: { type: String },
  twitter: { type: String },
  instagram: { type: String },
  linkedin: { type: String },
}, { _id: false });

// Main User Schema
const UserModalSchema = new Schema<UserType & Document>({
  userId: {
    type: String,
    required: true,
    unique: true,
    match: [/^USR\d{6}\d{4}$/, 'User ID must follow the format USRYYMMDDCOUNTER']
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  profilePhoto: {
    type: String,
    default: 'https://res.cloudinary.com/dsuefoemt/image/upload/v1751924077/user_profile/qqwgetbag5dxudclf8ku.jpg'
  },
  coverPhoto: {
    type: String,
    default: 'https://res.cloudinary.com/dsuefoemt/image/upload/v1751924037/user_profile/dj5rabde31zaowxq7dwn.jpg'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  name: {
    type: String,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: true,
    match: [/^\$argon2[id]?d?\$v=\d+\$m=\d+,t=\d+,p=\d+\$[a-zA-Z0-9+/]+\$[a-zA-Z0-9+/]+/, 'Password must be a valid Argon2 hash']
  },
  dateOfBirth: { type: Date },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  lastActive: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'brb', 'afk', 'zzz'],
    default: 'online'
  },
  verified: { type: Boolean, default: false },
  accountActive: { type: Boolean, default: true },
  sessionTimeOut: { type: Number, default: 10, min: 0 },

  followerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  friendCount: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingRequests: {
    type: Number,
    default: 0,
    min: 0
  },

  profileVisibility: {
    type: String,
    enum: ['public', 'private', 'friends-only'],
    default: 'public'
  },
  allowMessagesFrom: { type: String, enum: ['everyone', 'friends', 'no-one'], default: 'everyone' },
  showActivityStatus: { type: Boolean, default: true },
  showReadReceipts: { type: Boolean, default: true },
  showLastSeen: { type: Boolean, default: true },
  postCount: { type: Number, default: 0, min: 0 },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },
  website: { type: String },
  socialLinks: { type: SocialLinksSchema },
  blockedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'blockedUsers'
  }],

  // Notification types
  pushNotification: { type: Boolean, default: true },
  smsNotification: { type: Boolean, default: true },
  likesNotification: { type: Boolean, default: true },
  repostNotification: { type: Boolean, default: true },
  commentsNotification: { type: Boolean, default: true },
  newFollowersNotification: { type: Boolean, default: true },

  directMessage: { type: Boolean, default: true },
  roomInvitations: { type: Boolean, default: true },
  liveEvents: { type: Boolean, default: true },

  soundNotification: { type: Boolean, default: false },
  vibrationForNotification: { type: Boolean, default: false },

  primaryColor: {
    type: String,
    enum: ['blue', 'cyan', 'orange', 'purple', 'red'],
    default: 'blue'
  },
  themeMode: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      ret.id = ret._id.toString();
      if ('_id' in ret) delete ret._id;
      if ('__v' in ret) delete ret.__v;
      if ('password' in ret) delete ret.password;

      if (!ret.blockedUsers && doc.blockedUsers) {
        ret.blockedUsers = doc.blockedUsers;
      }
    }
  },
  toObject: {
    transform: function (doc, ret: any) {
      ret.id = ret._id.toString();
      if ('_id' in ret) delete ret._id;
      if ('__v' in ret) delete ret.__v;
      // if ('password' in ret) delete ret.password;
    }
  }
});

// Indexes
UserModalSchema.index({ username: 1 }, { unique: true });
UserModalSchema.index({ email: 1 }, { unique: true });
UserModalSchema.index({ userId: 1 }, { unique: true });
UserModalSchema.index({ followerCount: -1 });
UserModalSchema.index({ friendCount: -1 });

// Virtuals
UserModalSchema.virtual('fullProfile').get(function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name,
    email: this.email,
    profilePhoto: this.profilePhoto,
    coverPhoto: this.coverPhoto,
    bio: this.bio,
    followerCount: this.followerCount,
    followingCount: this.followingCount,
    friendCount: this.friendCount,
    pendingRequests: this.pendingRequests,
    postCount: this.postCount,
  };
});

export const UserModel = mongoose.model<UserType & Document>('users', UserModalSchema);
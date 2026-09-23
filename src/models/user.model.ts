// models/user.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import { UserBaseType } from 'src/types/user.type';

// Main User Schema
const UserModalSchema = new Schema<UserBaseType & Document>({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  genUserId: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    match: [
      /^USR[A-F0-9]{10}$/,
      'User ID must follow the format USRXXXXXXXXXX',
    ],
  },
  username: {
    type: String,
    // unique: true,
    // minlength: [3, 'Username must be at least 3 characters'],
    // maxlength: [30, 'Username cannot exceed 30 characters'],
    // match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
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
    match: [/^\$argon2[id]?d?\$v=\d+\$m=\d+,t=\d+,p=\d+\$[a-zA-Z0-9+/]+\$[a-zA-Z0-9+/]+/, 'Password must be a valid Argon2 hash']
  },

  lastActive: { type: Date, default: Date.now },

  verified: { type: Boolean, default: false },
  accountType: {
    type: String,
    enum: ['admin', 'supporter', 'member'],
    default: 'member'
  },

  follower_count: {
    type: Number,
    default: 0,
    min: 0
  },
  following_count: {
    type: Number,
    default: 0,
    min: 0
  },
  friend_count: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingRequests: {
    type: Number,
    default: 0,
    min: 0
  },

}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      // Handle main document
      if (ret._id) {
        ret.userId = ret._id.toString();
        delete ret._id;
      }
      if ('__v' in ret) delete ret.__v;
      if ('password' in ret) delete ret.password;
    }
  },
  toObject: {
    transform: function (doc, ret: any) {
      if (ret._id) {
        ret.userId = ret._id.toString();
        delete ret._id;
      }
      if ('__v' in ret) delete ret.__v;
    }
  }
});

// Indexes
UserModalSchema.index({ createdAt: -1 });

// Virtuals
UserModalSchema.virtual('fullProfile').get(function () {
  return {
    userId: this._id,
    genUserId: this.genUserId,
    username: this.username,
    name: this.name,
    email: this.email,
    profilePhoto: this.profilePhoto,
    bio: this.bio,
    follower_count: this.follower_count,
    following_count: this.following_count,
    friend_count: this.friend_count,
    pendingRequests: this.pendingRequests,
  };
});

export const UserModel = mongoose.model<UserBaseType & Document>('users', UserModalSchema);
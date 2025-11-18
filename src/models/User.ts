import { Schema, model } from 'mongoose';
import {
  DEFAULT_USER_ALLOW_STATUS,
  USER_ALLOW_STATUS_VALUES,
} from '@enums';
import { IUserDocument } from '@/types';

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: USER_ALLOW_STATUS_VALUES,
      required: true,
      default: DEFAULT_USER_ALLOW_STATUS,
      lowercase: true,
      trim: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true } 
  }
);

userSchema.index({ email: 1 }, { unique: true });

const User = model<IUserDocument>('User', userSchema);

export default User;


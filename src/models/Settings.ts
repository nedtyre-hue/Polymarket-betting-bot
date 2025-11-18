import { Schema, model } from 'mongoose';
import { ISettingsDocument } from '@/types';

const settingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    ratio: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    retryLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 3,
    },
    timeout: {
      type: Number,
      required: true,
      min: 1,
      max: 3600,
      default: 30,
    },
    increment: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    minBetValue: {
      type: Number,
      required: true,
      min: 5,
      default: 5,
    },
    maxBetValue: {
      type: Number,
      required: true,
      min: 0,
      default: 1000,
    },
    betSizeStrategy: {
      type: String,
      enum: ['PERCENTAGE', 'FIX'],
      required: true,
      default: 'PERCENTAGE',
    },
    fixedAmount: {
      type: Number,
      required: false,
      min: 0,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.index({ userId: 1 }, { unique: true });

const Settings = model<ISettingsDocument>('Settings', settingsSchema);

export default Settings;


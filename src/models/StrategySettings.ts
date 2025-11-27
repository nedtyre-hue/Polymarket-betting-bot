import { Schema, model } from 'mongoose';
import { IStrategySettingsDocument } from '@/types';

const strategySettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    marketSelection: {
      type: String,
      enum: ['BTC', 'ETH', 'SOL', 'XRP'],
      required: true,
      default: 'BTC',
    },
    triggerPrice: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 60,
    },
    tradeType: {
      type: String,
      enum: ['MARKET', 'LIMIT'],
      required: true,
      default: 'MARKET',
    },
    limitPrice: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
      default: null,
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
    fixedSize: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    retryLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 3,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true } 
  }
);

strategySettingsSchema.index({ userId: 1 }, { unique: true });

const StrategySettings = model<IStrategySettingsDocument>('StrategySettings', strategySettingsSchema);

export default StrategySettings;


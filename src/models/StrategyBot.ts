import { Schema, model } from 'mongoose';
import { IStrategyBotDocument } from '@/types';

const strategyBotSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      default: 'Strategy Bot',
    },
    wallet: {
      type: String,
      required: true,
      trim: true,
    },
    privateKey: {
      type: String,
      required: true,
      // Encrypted private key will be stored here
    },
    status: {
      type: String,
      enum: ['STOPPED', 'RUNNING', 'ERROR'],
      required: true,
      default: 'STOPPED',
      uppercase: true,
    },
    errorMessage: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    oddsStrategySettings: {
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
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true } 
  }
);

strategyBotSchema.index({ userId: 1 });
strategyBotSchema.index({ status: 1 });

const StrategyBot = model<IStrategyBotDocument>('StrategyBot', strategyBotSchema);

export default StrategyBot;


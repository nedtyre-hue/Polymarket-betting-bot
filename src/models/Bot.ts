import { Schema, model } from 'mongoose';
import { IBotDocument } from '@/types';

const botSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      default: 'Bot',
    },
    copyTradingWallet: {
      type: String,
      required: true,
      trim: true,
    },
    copyTradingWalletContractAddress: {
      type: String,
      required: true,
      trim: true,
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
    settings: {
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
        default: 1,
      },
      increment: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
      },
      minBetSize: {
        type: Number,
        required: true,
        min: 5,
        default: 5,
      },
      maxBetSize: {
        type: Number,
        required: true,
        min: 0,
        default: 1000,
      },
      maxBuySize: {
        type: Number,
        required: false,
        min: 0,
        default: null,
      },
      maxSellSize: {
        type: Number,
        required: false,
        min: 0,
        default: null,
      },
      dumpRemainingSharesOnPartialSell: {
        type: Boolean,
        required: false,
        default: false,
      },
      betSizeStrategy: {
        type: String,
        enum: ['PERCENTAGE', 'FIX'],
        required: true,
        default: 'PERCENTAGE',
      },
      fixedSize: {
        type: Number,
        required: false,
        min: 0,
        default: 10,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true } 
  }
);

botSchema.index({ userId: 1 });
botSchema.index({ status: 1 });

const Bot = model<IBotDocument>('Bot', botSchema);

export default Bot;


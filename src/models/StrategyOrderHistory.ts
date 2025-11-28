import { Schema, model } from 'mongoose';
import { IStrategyOrderHistoryDocument } from '@/types';

const strategyOrderHistorySchema = new Schema(
  {
    botId: {
      type: Schema.Types.ObjectId,
      ref: 'StrategyBot',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'PARTIAL'],
      required: true,
      default: 'PENDING',
      uppercase: true,
    },
    // Trade data
    // For strategy bots, these may not be available since orders are placed directly on CLOB
    transactionHash: {
      type: String,
      required: false,
      default: null,
    },
    blockNumber: {
      type: Number,
      required: false,
      default: 0,
    },
    tokenId: {
      type: String,
      required: true,
    },
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    // Original trade amounts
    originalMakerAmount: {
      type: String,
      required: true,
    },
    originalTakerAmount: {
      type: String,
      required: true,
    },
    // Our executed order details
    orderId: {
      type: String,
      default: null,
    },
    executedPrice: {
      type: Number,
      default: null,
    },
    executedSize: {
      type: Number,
      default: null,
    },
    // Error information if failed
    errorMessage: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },
    // Retry information
    attemptCount: {
      type: Number,
      default: 0,
    },
    // Timestamps
    executedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes for efficient queries
strategyOrderHistorySchema.index({ botId: 1, createdAt: -1 });
strategyOrderHistorySchema.index({ userId: 1, createdAt: -1 });
strategyOrderHistorySchema.index({ status: 1, createdAt: -1 });
strategyOrderHistorySchema.index({ transactionHash: 1 });

const StrategyOrderHistory = model<IStrategyOrderHistoryDocument>('StrategyOrderHistory', strategyOrderHistorySchema);

export default StrategyOrderHistory;


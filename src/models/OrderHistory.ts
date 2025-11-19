import { Schema, model } from 'mongoose';
import { IOrderHistoryDocument } from '@/types';

const orderHistorySchema = new Schema(
  {
    botId: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'PARTIAL'],
      required: true,
      default: 'PENDING',
      uppercase: true,
    },
    // Trade data from blockchain
    transactionHash: {
      type: String,
      required: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      required: true,
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
orderHistorySchema.index({ botId: 1, createdAt: -1 });
orderHistorySchema.index({ userId: 1, createdAt: -1 });
orderHistorySchema.index({ status: 1, createdAt: -1 });
orderHistorySchema.index({ transactionHash: 1 });

const OrderHistory = model<IOrderHistoryDocument>('OrderHistory', orderHistorySchema);

export default OrderHistory;


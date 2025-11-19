import { Document, Types } from 'mongoose';
import type { UserAllowStatus } from '@enums';

/**
 * Custom error interface
 */
export interface TCustomError extends Error {
  statusCode: number;
  message: string;
}

/**
 * JWT types
 */
export interface IJwtPayload {
  id: string;
  email: string;
}

/**
 * Pagination types
 */
export interface IPaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Auth types
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  status?: UserAllowStatus;
}

export interface IAuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserAllowStatus;
  };
  token: string;
}

/**
 * User types
 */
export interface IUserAttributes {
  id?: string;
  _id?: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  status: UserAllowStatus;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IUserCreationAttributes = Omit<IUserAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type IUserDocument = IUserAttributes & Document<Types.ObjectId>;

export interface IUserPaginationOptions extends IPaginationOptions {
  status?: UserAllowStatus;
}

/**
 * Settings types
 */
export type BetSizeStrategy = 'PERCENTAGE' | 'FIX';

export interface ISettingsAttributes {
  id?: string;
  _id?: Types.ObjectId;
  userId: Types.ObjectId | string;
  ratio: number;
  retryLimit: number;
  timeout: number;
  increment: number;
  minBetSize: number;
  maxBetSize: number;
  betSizeStrategy: BetSizeStrategy;
  fixedSize?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ISettingsCreationAttributes = Omit<ISettingsAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type ISettingsDocument = ISettingsAttributes & Document<Types.ObjectId>;

/**
 * Bot types
 */
export type BotStatus = 'STOPPED' | 'RUNNING' | 'ERROR';

export interface IBotSettings {
  ratio: number;
  retryLimit: number;
  timeout: number;
  increment: number;
  minBetSize: number;
  maxBetSize: number;
  betSizeStrategy: BetSizeStrategy;
  fixedSize?: number;
}

export interface IBotAttributes {
  id?: string;
  _id?: Types.ObjectId;
  userId: Types.ObjectId | string;
  name: string;
  copyTradingWallet: string;
  copyTradingWalletContractAddress: string;
  wallet: string;
  privateKey: string; // Encrypted
  status: BotStatus;
  errorMessage?: string | null;
  settings: IBotSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IBotCreationAttributes = Omit<IBotAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type IBotDocument = IBotAttributes & Document<Types.ObjectId>;

export interface IBotPaginationOptions extends IPaginationOptions {
  status?: BotStatus;
}

export type { UserAllowStatus } from '@enums';

/**
 * Trade types
 */
export interface TradeData {
  blockNumber: number;
  transactionHash: string;
  tokenId: string;
  side: number;
  makerAmount: number;
  takerAmount: number;
}

export interface TradeParams {
  targetWallet: string;
  copyRatio: number;
  retryLimit: number;
  orderIncrement: number;
  orderTimeout: number;
  betSizeStrategy: 'PERCENTAGE' | 'FIX';
  fixedSize?: number;
  minBetSize: number;
  maxBetSize: number;
}

/**
 * Interface for placed order response
 */
export interface IPlacedOrderResponse {
  success: boolean;
  orderID: string;
  [key: string]: any;
}

/**
 * Interface for canceled orders response
 */
export interface ICanceledOrders {
  canceled: string[];
  [key: string]: any;
}

/**
 * Order History types
 */
export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface IOrderHistoryAttributes {
  id?: string;
  _id?: Types.ObjectId;
  botId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  status: OrderStatus;
  transactionHash: string;
  blockNumber: number;
  tokenId: string;
  side: 'BUY' | 'SELL';
  originalMakerAmount: string;
  originalTakerAmount: string;
  orderId?: string | null;
  executedPrice?: number | null;
  executedSize?: number | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  attemptCount: number;
  executedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IOrderHistoryCreationAttributes = Omit<IOrderHistoryAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type IOrderHistoryDocument = IOrderHistoryAttributes & Document<Types.ObjectId>;
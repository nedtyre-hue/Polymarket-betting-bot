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
  minBetValue: number;
  maxBetValue: number;
  betSizeStrategy: BetSizeStrategy;
  fixedAmount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ISettingsCreationAttributes = Omit<ISettingsAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'>;
export type ISettingsDocument = ISettingsAttributes & Document<Types.ObjectId>;

export type { UserAllowStatus } from '@enums';

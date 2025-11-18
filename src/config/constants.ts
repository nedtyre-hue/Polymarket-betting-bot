import dotenv from 'dotenv';
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const SERVER_PORT = Number(process.env.SERVER_PORT) || 8000;
export const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// MongoDB configuration
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/contractor';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'contractor';
export const MONGODB_MAX_POOL_SIZE = Number(process.env.MONGODB_MAX_POOL_SIZE) || 20;

// CORS configuration
export const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process
      .env
      .CORS_ALLOWED_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : '*';
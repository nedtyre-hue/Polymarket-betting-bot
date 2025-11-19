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

// 🌐 Polymarket API Endpoints
export const CLOB_HTTP_URL = process.env.CLOB_HTTP_URL as string; // HTTP endpoint for Polymarket CLOB API
export const CLOB_WS_URL = process.env.CLOB_WS_URL as string; // WebSocket endpoint for Polymarket CLOB

// 🔗 Blockchain Connection Endpoints (Polygon Network)
export const RPC_URL = process.env.RPC_URL as string; // HTTP RPC endpoint (e.g., Alchemy, Infura)
export const WSS_URL = process.env.WSS_URL as string; // WebSocket RPC endpoint (for real-time block monitoring)

export const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as string;

export const CLOB_CONTRACT_ADDRESSES = [
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296'
];
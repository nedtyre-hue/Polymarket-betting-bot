import mongoose from 'mongoose';
import { MONGODB_DB_NAME, MONGODB_MAX_POOL_SIZE, MONGODB_URI, NODE_ENV } from './constants';
import logger from '@/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
      maxPoolSize: MONGODB_MAX_POOL_SIZE,
      autoIndex: NODE_ENV === 'development',
    });

    logger.info(`Connected to MongoDB database "${MONGODB_DB_NAME}".`);
  } catch (error) {
    logger.error('Unable to connect to MongoDB:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost.');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB connection re-established.');
});

export default mongoose;


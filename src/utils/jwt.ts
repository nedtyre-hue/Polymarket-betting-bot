import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/config/constants';
import CustomError from '@/utils/customError';
import { IJwtPayload } from '@/types';

/**
 * Generate JWT token
 */
export const generateToken = (payload: IJwtPayload): string => {
  if (!JWT_SECRET || JWT_SECRET === '') {
    throw new CustomError('JWT_SECRET is not defined in environment variables', 500);
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): IJwtPayload => {
  if (!JWT_SECRET) {
    throw new CustomError('JWT_SECRET is not defined in environment variables', 500);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IJwtPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new CustomError('Token has expired', 401);
    } else if (error.name === 'JsonWebTokenError') {
      throw new CustomError('Invalid token', 401);
    } else {
      throw new CustomError('Token verification failed', 401);
    }
  }
};

/**
 * Decode token without verification (for debugging purposes)
 */
export const decodeToken = (token: string): IJwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as IJwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};


import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import authService from '@/services/authService';
import logger from '@/utils/logger';

/**
 * Middleware to authenticate user using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await authService.verifyUserStatus(decoded.id);

    // Attach user to request object
    (req as any).user = user;

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = authenticate;


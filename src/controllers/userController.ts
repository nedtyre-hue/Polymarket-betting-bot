import { Request, Response } from 'express';
import userService from '@/services/userService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import bcrypt from 'bcrypt';
import { IUserPaginationOptions } from '@/types';
import { USER_ALLOW_STATUS } from '@enums';

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await userService.findUserByEmail(userData.email);
    if (existingUser) {
      throw new CustomError('User with this email already exists', 400);
    }

    // Hash password before storing
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const user = await userService.createUser(userData);
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error: any) {
    logger.error('Error creating user:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all users with pagination
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status, sortBy, sortOrder } = req.query as unknown as IUserPaginationOptions;

    const result = await userService.findAllUsers({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        users: result.data,
        pagination: result.pagination,
      }
    });
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await userService.findUserById(userId);

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error: any) {
    logger.error('Error fetching user:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userData = req.body;

    const user = await userService.updateUser(userId, userData);

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userResponse,
    });
  } catch (error: any) {
    logger.error('Error updating user:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const success = await userService.deactivateUser(userId);

    if (!success) {
      throw new CustomError('User not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    logger.error('Error deactivating user:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete user permanently
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const success = await userService.deleteUser(userId);

    if (!success) {
      throw new CustomError('User not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting user:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await userService.countUsers();
    const allowedUsers = await userService.countUsers(USER_ALLOW_STATUS.ALLOW);
    const blockedUsers = await userService.countUsers(USER_ALLOW_STATUS.BLOCK);

    return res.status(200).json({
      success: true,
      message: 'User statistics fetched successfully',
      data: {
        totalUsers,
        allowedUsers,
        blockedUsers,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching user stats:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
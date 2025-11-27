import { Request, Response } from 'express';
import strategyBotService from '@/services/odds-strategy/strategyBotService';
import orderHistoryService from '@/services/orderHistoryService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import {
  IStrategyBotCreationAttributes,
  IStrategyBotPaginationOptions,
  BotStatus,
  IPaginationOptions,
} from '@/types';

/**
 * Get all strategy bots for the authenticated user with pagination
 */
export const getStrategyBots = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    // Use validated query if available (with proper type conversion), otherwise fall back to req.query
    const validatedQuery = (req as any).validatedQuery || req.query;
    
    const options: IStrategyBotPaginationOptions = {
      page: Number(validatedQuery.page) || 1,
      limit: Number(validatedQuery.limit) || 12,
      search: (validatedQuery.search as string) || '',
      status: (validatedQuery.status as BotStatus) || undefined,
      sortBy: (validatedQuery.sortBy as string) || 'createdAt',
      sortOrder: (validatedQuery.sortOrder as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await strategyBotService.getStrategyBotsByUserId(userId, options);

    return res.status(200).json({
      success: true,
      message: 'Strategy bots fetched successfully',
      data: {
        bots: result.data,
        pagination: result.pagination,
      }
    });
  } catch (error: any) {
    logger.error('Error fetching strategy bots:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get a single strategy bot by ID
 */
export const getStrategyBotById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;

    const bot = await strategyBotService.getStrategyBotById(userId, id);

    if (!bot) {
      throw new CustomError('Strategy bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Strategy bot fetched successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error fetching strategy bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get strategy bot details with order history
 */
export const getStrategyBotDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const validatedQuery = (req as any).validatedQuery || req.query;

    const bot = await strategyBotService.getStrategyBotById(userId, id);

    if (!bot) {
      throw new CustomError('Strategy bot not found', 404);
    }

    // Get order history
    const orderHistoryOptions: IPaginationOptions = {
      page: Number(validatedQuery.page) || 1,
      limit: Number(validatedQuery.limit) || 50,
      search: (validatedQuery.search as string) || '',
      sortBy: (validatedQuery.sortBy as string) || 'createdAt',
      sortOrder: (validatedQuery.sortOrder as 'ASC' | 'DESC') || 'DESC',
      status: (validatedQuery.status as string) || undefined,
      side: (validatedQuery.side as string) || undefined,
    };

    const [orderHistoryResult, orderStats] = await Promise.all([
      orderHistoryService.getOrderHistoryByBotId(userId, bot._id.toString(), orderHistoryOptions),
      orderHistoryService.getOrderHistoryStats(userId, bot._id.toString(), validatedQuery.timeframeHours ? Number(validatedQuery.timeframeHours) : undefined),
    ]);

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Strategy bot details fetched successfully',
      data: {
        bot: botResponse,
        orderHistory: orderHistoryResult.data,
        orderHistoryPagination: orderHistoryResult.pagination,
        orderStats,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching strategy bot details:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a new strategy bot
 */
export const createStrategyBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const botData: IStrategyBotCreationAttributes = {
      ...req.body,
    };

    const bot = await strategyBotService.createStrategyBot(userId, botData);

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(201).json({
      success: true,
      message: 'Strategy bot created successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error creating strategy bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update a strategy bot
 */
export const updateStrategyBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const updateData = req.body;

    const bot = await strategyBotService.updateStrategyBot(userId, id, updateData);

    if (!bot) {
      throw new CustomError('Strategy bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Strategy bot updated successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error updating strategy bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update strategy bot status (start/stop)
 */
export const updateStrategyBotStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    const bot = await strategyBotService.updateStrategyBotStatus(userId, id, status);

    if (!bot) {
      throw new CustomError('Strategy bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Strategy bot status updated successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error updating strategy bot status:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a strategy bot
 */
export const deleteStrategyBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;

    const deleted = await strategyBotService.deleteStrategyBot(userId, id);

    if (!deleted) {
      throw new CustomError('Strategy bot not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Strategy bot deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting strategy bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


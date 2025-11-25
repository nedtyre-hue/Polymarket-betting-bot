import { Request, Response } from 'express';
import botService from '@/services/botService';
import settingsService from '@/services/settingsService';
import orderHistoryService from '@/services/orderHistoryService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import {
  IBotCreationAttributes,
  IBotPaginationOptions,
  BotStatus,
  IPaginationOptions,
} from '@/types';

/**
 * Get all bots for the authenticated user with pagination
 */
export const getBots = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    // Use validated query if available (with proper type conversion), otherwise fall back to req.query
    const validatedQuery = (req as any).validatedQuery || req.query;
    
    const options: IBotPaginationOptions = {
      page: Number(validatedQuery.page) || 1,
      limit: Number(validatedQuery.limit) || 12,
      search: (validatedQuery.search as string) || '',
      status: (validatedQuery.status as BotStatus) || undefined,
      sortBy: (validatedQuery.sortBy as string) || 'createdAt',
      sortOrder: (validatedQuery.sortOrder as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await botService.getBotsByUserId(userId, options);

    return res.status(200).json({
      success: true,
      message: 'Bots fetched successfully',
      data: {
        bots: result.data,
        pagination: result.pagination,
      }
    });
  } catch (error: any) {
    logger.error('Error fetching bots:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get a single bot by ID
 */
export const getBotById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;

    const bot = await botService.getBotById(userId, id);

    if (!bot) {
      throw new CustomError('Bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Bot fetched successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error fetching bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a new bot
 */
export const createBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const botData: IBotCreationAttributes = req.body;

    // Load default settings if not provided
    if (!botData.settings) {
      const defaultSettings = await settingsService.getSettingsByUserId(userId);
      if (defaultSettings) {
        botData.settings = {
          ratio: defaultSettings.ratio,
          retryLimit: defaultSettings.retryLimit,
          timeout: defaultSettings.timeout,
          increment: defaultSettings.increment,
          minBetSize: defaultSettings.minBetSize,
          maxBetSize: defaultSettings.maxBetSize,
          maxBuySize: defaultSettings.maxBuySize ?? null,
          maxSellSize: defaultSettings.maxSellSize ?? null,
          dumpRemainingSharesOnPartialSell: defaultSettings.dumpRemainingSharesOnPartialSell ?? false,
          betSizeStrategy: defaultSettings.betSizeStrategy,
          fixedSize: defaultSettings.fixedSize,
        };
      } else {
        // Use hardcoded defaults
        botData.settings = {
          ratio: 0.5,
          retryLimit: 3,
          timeout: 30,
          increment: 1,
          minBetSize: 5,
          maxBetSize: 1000,
          maxBuySize: null,
          maxSellSize: null,
          dumpRemainingSharesOnPartialSell: false,
          betSizeStrategy: 'PERCENTAGE',
          fixedSize: 10,
        };
      }
    }

    const bot = await botService.createBot(userId, botData);

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(201).json({
      success: true,
      message: 'Bot created successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error creating bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update a bot
 */
export const updateBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const botData = req.body;

    const bot = await botService.updateBot(userId, id, botData);

    if (!bot) {
      throw new CustomError('Bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Bot updated successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error updating bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update bot status
 */
export const updateBotStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    const bot = await botService.updateBotStatus(userId, id, status);

    if (!bot) {
      throw new CustomError('Bot not found', 404);
    }

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Bot status updated successfully',
      data: botResponse,
    });
  } catch (error: any) {
    logger.error('Error updating bot status:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete a bot
 */
export const deleteBot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;

    const success = await botService.deleteBot(userId, id);

    if (!success) {
      throw new CustomError('Bot not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Bot deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting bot:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get bot details with order history
 */
export const getBotDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const { id } = req.params;
    const validatedQuery = (req as any).validatedQuery || req.query;

    // Get bot
    const bot = await botService.getBotById(userId, id);

    if (!bot) {
      throw new CustomError('Bot not found', 404);
    }

    // Get order history options
    const orderHistoryOptions: IPaginationOptions = {
      page: Number(validatedQuery.page) || 1,
      limit: Number(validatedQuery.limit) || 50,
      sortBy: (validatedQuery.sortBy as string) || 'createdAt',
      sortOrder: (validatedQuery.sortOrder as 'ASC' | 'DESC') || 'DESC',
      status: validatedQuery.status as string | undefined,
      side: validatedQuery.side as string | undefined,
      search: (validatedQuery.search as string) || undefined,
    };

    // Get timeframe for stats (optional, in hours)
    const timeframeHours = validatedQuery.timeframeHours
      ? Number(validatedQuery.timeframeHours)
      : undefined;

    // Get order history and stats
    const [orderHistory, stats] = await Promise.all([
      orderHistoryService.getOrderHistoryByBotId(userId, id, orderHistoryOptions),
      orderHistoryService.getOrderHistoryStats(userId, id, timeframeHours),
    ]);

    // Don't expose the private key
    const botResponse = bot.toObject();
    delete (botResponse as any).privateKey;

    return res.status(200).json({
      success: true,
      message: 'Bot details fetched successfully',
      data: {
        bot: botResponse,
        orderHistory: orderHistory.data,
        orderHistoryPagination: orderHistory.pagination,
        orderStats: stats,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching bot details:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


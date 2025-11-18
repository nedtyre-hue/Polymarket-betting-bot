import { Request, Response } from 'express';
import botService from '@/services/botService';
import settingsService from '@/services/settingsService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import {
  IBotCreationAttributes,
  IBotPaginationOptions,
  BotStatus,
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
          minBetValue: defaultSettings.minBetValue,
          maxBetValue: defaultSettings.maxBetValue,
          betSizeStrategy: defaultSettings.betSizeStrategy,
          fixedAmount: defaultSettings.fixedAmount,
        };
      } else {
        // Use hardcoded defaults
        botData.settings = {
          ratio: 0.5,
          retryLimit: 3,
          timeout: 30,
          increment: 1,
          minBetValue: 5,
          maxBetValue: 1000,
          betSizeStrategy: 'PERCENTAGE',
          fixedAmount: 10,
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


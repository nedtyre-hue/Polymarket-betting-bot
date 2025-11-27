import { Request, Response } from 'express';
import strategySettingsService from '@/services/odds-strategy/strategySettingsService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import { IStrategySettingsCreationAttributes } from '@/types';

/**
 * Get strategy settings for the authenticated user
 */
export const getStrategySettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const settings = await strategySettingsService.getStrategySettingsByUserId(userId);

    if (!settings) {
      // Return default settings if none exist
      return res.status(200).json({
        success: true,
        message: 'Strategy settings fetched successfully',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Strategy settings fetched successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error fetching strategy settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create or update strategy settings for the authenticated user
 */
export const saveStrategySettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const settingsData: IStrategySettingsCreationAttributes = req.body;

    const settings = await strategySettingsService.createOrUpdateStrategySettings(
      userId,
      settingsData
    );

    return res.status(200).json({
      success: true,
      message: 'Strategy settings saved successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error saving strategy settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete strategy settings for the authenticated user
 */
export const deleteStrategySettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const success = await strategySettingsService.deleteStrategySettings(userId);

    if (!success) {
      throw new CustomError('Strategy settings not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Strategy settings deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting strategy settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


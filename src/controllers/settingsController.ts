import { Request, Response } from 'express';
import settingsService from '@/services/settingsService';
import logger from '@/utils/logger';
import CustomError from '@/utils/customError';
import { ISettingsCreationAttributes } from '@/types';

/**
 * Get settings for the authenticated user
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const settings = await settingsService.getSettingsByUserId(userId);

    if (!settings) {
      return res.status(200).json({
        success: true,
        message: 'Settings not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Settings fetched successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error fetching settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create or update settings for the authenticated user
 */
export const saveSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const settingsData: ISettingsCreationAttributes = req.body;

    const settings = await settingsService.upsertSettings(userId, settingsData);

    return res.status(200).json({
      success: true,
      message: 'Settings saved successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error saving settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update settings for the authenticated user
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const settingsData = req.body;

    const settings = await settingsService.updateSettings(userId, settingsData);

    if (!settings) {
      throw new CustomError('Settings not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete settings for the authenticated user
 */
export const deleteSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new CustomError('User not authenticated', 401);
    }

    const success = await settingsService.deleteSettings(userId);

    if (!success) {
      throw new CustomError('Settings not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Settings deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


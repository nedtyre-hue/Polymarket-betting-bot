import StrategySettings from '@/models/StrategySettings';
import { IStrategySettingsCreationAttributes, IStrategySettingsDocument } from '@/types';
import logger from '@/utils/logger';

class StrategySettingsService {
  /**
   * Get strategy settings by user ID
   */
  async getStrategySettingsByUserId(userId: string): Promise<IStrategySettingsDocument | null> {
    try {
      const settings = await StrategySettings.findOne({ userId }).exec();
      return settings;
    } catch (error) {
      logger.error('Error fetching strategy settings:', error);
      throw error;
    }
  }

  /**
   * Create or update strategy settings for a user
   */
  async createOrUpdateStrategySettings(
    userId: string,
    settingsData: IStrategySettingsCreationAttributes
  ): Promise<IStrategySettingsDocument> {
    try {
      const settings = await StrategySettings.findOneAndUpdate(
        { userId },
        {
          ...settingsData,
          userId,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      ).exec();

      return settings;
    } catch (error) {
      logger.error('Error creating/updating strategy settings:', error);
      throw error;
    }
  }

  /**
   * Delete strategy settings for a user
   */
  async deleteStrategySettings(userId: string): Promise<boolean> {
    try {
      const result = await StrategySettings.deleteOne({ userId }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting strategy settings:', error);
      throw error;
    }
  }
}

export default new StrategySettingsService();


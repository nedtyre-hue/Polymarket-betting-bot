import { Settings } from '@/models';
import {
  ISettingsAttributes,
  ISettingsCreationAttributes,
  ISettingsDocument,
} from '@/types';

/**
 * Settings Service
 */
class SettingsService {
  /**
   * Get settings by user ID
   */
  async getSettingsByUserId(userId: string): Promise<ISettingsDocument | null> {
    return Settings.findOne({ userId }).exec();
  }

  /**
   * Create or update settings for a user
   */
  async upsertSettings(
    userId: string,
    settingsData: ISettingsCreationAttributes
  ): Promise<ISettingsDocument> {
    const normalizedData: ISettingsCreationAttributes = {
      ...settingsData,
      userId,
    };

    const settings = await Settings.findOneAndUpdate(
      { userId },
      normalizedData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).exec();

    return settings!;
  }

  /**
   * Update settings for a user
   */
  async updateSettings(
    userId: string,
    settingsData: Partial<ISettingsAttributes>
  ): Promise<ISettingsDocument | null> {
    return Settings.findOneAndUpdate(
      { userId },
      settingsData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete settings for a user
   */
  async deleteSettings(userId: string): Promise<boolean> {
    const result = await Settings.findOneAndDelete({ userId }).exec();
    return Boolean(result);
  }
}

export default new SettingsService();


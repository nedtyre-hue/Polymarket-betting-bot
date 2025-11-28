import { StrategyBot } from '@/models';
import {
  IStrategyBotAttributes,
  IStrategyBotCreationAttributes,
  IStrategyBotDocument,
  IStrategyBotPaginationOptions,
  IPaginatedResponse,
  BotStatus,
} from '@/types';
import { encrypt, decrypt } from '@/utils/encryption';
import strategyBotManager from './strategyBotManager';

/**
 * Strategy Bot Service
 * Handles CRUD operations for odds strategy bots
 */
class StrategyBotService {
  /**
   * Get all strategy bots for a user with pagination
   */
  async getStrategyBotsByUserId(
    userId: string,
    options: IStrategyBotPaginationOptions = {}
  ): Promise<IPaginatedResponse<IStrategyBotDocument>> {
    const {
      page = 1,
      limit = 12,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const query: any = { 
      userId,
    };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Sort options
    const sort: any = {};
    sort[sortBy] = sortOrder === 'ASC' ? 1 : -1;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [data, totalCount] = await Promise.all([
      StrategyBot.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      StrategyBot.countDocuments(query).exec(),
    ]);

    // Convert to documents
    const bots = data.map((bot: any) => new StrategyBot(bot));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: bots as IStrategyBotDocument[],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get strategy bot by ID for a user
   */
  async getStrategyBotById(userId: string, botId: string): Promise<IStrategyBotDocument | null> {
    return StrategyBot.findOne({ _id: botId, userId }).exec();
  }

  /**
   * Create a new strategy bot
   */
  async createStrategyBot(
    userId: string,
    botData: IStrategyBotCreationAttributes
  ): Promise<IStrategyBotDocument> {
    // Encrypt private key
    const encryptedPrivateKey = encrypt(botData.privateKey);

    const normalizedData: IStrategyBotCreationAttributes = {
      ...botData,
      userId,
      privateKey: encryptedPrivateKey,
      status: 'STOPPED',
    };

    const bot = new StrategyBot(normalizedData);
    await bot.save();

    // Initialize bot in strategy bot manager
    await strategyBotManager.handleStrategyBotCreated(bot);

    return bot;
  }

  /**
   * Update a strategy bot
   */
  async updateStrategyBot(
    userId: string,
    botId: string,
    updateData: Partial<IStrategyBotCreationAttributes>
  ): Promise<IStrategyBotDocument | null> {
    const bot = await StrategyBot.findOne({ _id: botId, userId }).exec();

    if (!bot) {
      return null;
    }

    // Encrypt private key if provided
    if (updateData.privateKey) {
      updateData.privateKey = encrypt(updateData.privateKey);
    }

    // Update bot
    Object.assign(bot, updateData);
    await bot.save();

    // Update bot in strategy bot manager
    await strategyBotManager.handleStrategyBotUpdated(bot);

    return bot;
  }

  /**
   * Delete a strategy bot
   */
  async deleteStrategyBot(userId: string, strategyBotId: string): Promise<boolean> {
    const bot = await StrategyBot.findOne({ _id: strategyBotId, userId }).exec();

    if (!bot) {
      return false;
    }

    const botId = bot._id.toString();

    // Remove bot from strategy bot manager
    strategyBotManager.handleStrategyBotDeleted(botId);

    // Delete bot
    await StrategyBot.deleteOne({ _id: botId }).exec();

    return true;
  }

  /**
   * Update strategy bot status
   */
  async updateStrategyBotStatus(
    userId: string,
    botId: string,
    status: BotStatus
  ): Promise<IStrategyBotDocument | null> {
    const bot = await StrategyBot.findOne({ _id: botId, userId }).exec();

    if (!bot) {
      return null;
    }

    bot.status = status;
    await bot.save();

    // Update bot in strategy bot manager
    await strategyBotManager.handleStrategyBotUpdated(bot);

    return bot;
  }
}

export default new StrategyBotService();


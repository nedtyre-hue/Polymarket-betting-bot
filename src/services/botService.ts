import { Bot } from '@/models';
import {
  IBotAttributes,
  IBotCreationAttributes,
  IBotDocument,
  IBotPaginationOptions,
  IPaginatedResponse,
  BotStatus,
} from '@/types';
import { encrypt, decrypt } from '@/utils/encryption';

/**
 * Bot Service
 */
class BotService {
  /**
   * Get all bots for a user with pagination
   */
  async getBotsByUserId(
    userId: string,
    options: IBotPaginationOptions = {}
  ): Promise<IPaginatedResponse<IBotDocument>> {
    const {
      page = 1,
      limit = 12,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const query: any = { userId };

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
      Bot.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      Bot.countDocuments(query).exec(),
    ]);

    // Convert to documents
    const bots = data.map((bot: any) => new Bot(bot));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: bots as IBotDocument[],
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
   * Get bot by ID for a user
   */
  async getBotById(userId: string, botId: string): Promise<IBotDocument | null> {
    return Bot.findOne({ _id: botId, userId }).exec();
  }

  /**
   * Create a new bot
   */
  async createBot(
    userId: string,
    botData: IBotCreationAttributes
  ): Promise<IBotDocument> {
    // Encrypt private key
    const encryptedPrivateKey = encrypt(botData.privateKey);

    const normalizedData: IBotCreationAttributes = {
      ...botData,
      userId,
      privateKey: encryptedPrivateKey,
      status: botData.status || 'STOPPED',
    };

    const bot = new Bot(normalizedData);
    return bot.save();
  }

  /**
   * Update a bot
   */
  async updateBot(
    userId: string,
    botId: string,
    botData: Partial<IBotAttributes>
  ): Promise<IBotDocument | null> {
    const updateData: any = { ...botData };

    // Encrypt private key if provided
    if (updateData.privateKey) {
      updateData.privateKey = encrypt(updateData.privateKey);
    }

    return Bot.findOneAndUpdate(
      { _id: botId, userId },
      updateData,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update bot status
   */
  async updateBotStatus(
    userId: string,
    botId: string,
    status: BotStatus
  ): Promise<IBotDocument | null> {
    return Bot.findOneAndUpdate(
      { _id: botId, userId },
      { status },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete a bot
   */
  async deleteBot(userId: string, botId: string): Promise<boolean> {
    const result = await Bot.findOneAndDelete({ _id: botId, userId }).exec();
    return Boolean(result);
  }

  /**
   * Get decrypted private key for a bot (used internally)
   */
  async getDecryptedPrivateKey(userId: string, botId: string): Promise<string | null> {
    const bot = await Bot.findOne({ _id: botId, userId }).select('privateKey').lean().exec();
    if (!bot) {
      return null;
    }
    return decrypt(bot.privateKey);
  }
}

export default new BotService();


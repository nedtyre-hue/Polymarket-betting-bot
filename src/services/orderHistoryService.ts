import OrderHistory from '@/models/OrderHistory';
import {
  IOrderHistoryDocument,
  IPaginatedResponse,
  IPaginationOptions,
} from '@/types';

/**
 * Order History Service
 */
class OrderHistoryService {
  /**
   * Get order history for a bot with pagination, filtering, and search
   */
  async getOrderHistoryByBotId(
    userId: string,
    botId: string,
    options: IPaginationOptions = {}
  ): Promise<IPaginatedResponse<IOrderHistoryDocument>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      side,
      search,
    } = options;

    // Build query - ensure bot belongs to user
    const query: any = { botId, userId };

    // Apply filters
    if (status) {
      query.status = status.toUpperCase();
    }

    if (side) {
      query.side = side.toUpperCase();
    }

    // Apply search (tokenId or transactionHash)
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { tokenId: searchRegex },
        { transactionHash: searchRegex },
      ];
    }

    // Sort options
    const sort: any = {};
    sort[sortBy] = sortOrder === 'ASC' ? 1 : -1;

    // Calculate skip
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      OrderHistory.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      OrderHistory.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: data as IOrderHistoryDocument[],
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
   * Get order history statistics for a bot
   */
  async getOrderHistoryStats(userId: string, botId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    partial: number;
  }> {
    const query = { botId, userId };

    const [total, success, failed, pending, partial] = await Promise.all([
      OrderHistory.countDocuments(query).exec(),
      OrderHistory.countDocuments({ ...query, status: 'SUCCESS' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'FAILED' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'PENDING' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'PARTIAL' }).exec(),
    ]);

    return {
      total,
      success,
      failed,
      pending,
      partial,
    };
  }
}

export default new OrderHistoryService();


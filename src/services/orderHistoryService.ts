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
   * Supports timeframe filtering and side breakdown
   */
  async getOrderHistoryStats(
    userId: string,
    botId: string,
    timeframeHours?: number
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    partial: number;
    buy: {
      total: number;
      success: number;
      failed: number;
      pending: number;
      partial: number;
      successPercent: number;
      failedPercent: number;
      partialPercent: number;
    };
    sell: {
      total: number;
      success: number;
      failed: number;
      pending: number;
      partial: number;
      successPercent: number;
      failedPercent: number;
      partialPercent: number;
    };
  }> {
    const query: any = { botId, userId };

    // Apply timeframe filter if provided
    if (timeframeHours && timeframeHours > 0) {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - timeframeHours);
      query.createdAt = { $gte: cutoffDate };
    }

    // Get overall stats
    const [total, success, failed, pending, partial] = await Promise.all([
      OrderHistory.countDocuments(query).exec(),
      OrderHistory.countDocuments({ ...query, status: 'SUCCESS' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'FAILED' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'PENDING' }).exec(),
      OrderHistory.countDocuments({ ...query, status: 'PARTIAL' }).exec(),
    ]);

    // Get BUY side stats
    const buyQuery = { ...query, side: 'BUY' };
    const [buyTotal, buySuccess, buyFailed, buyPending, buyPartial] = await Promise.all([
      OrderHistory.countDocuments(buyQuery).exec(),
      OrderHistory.countDocuments({ ...buyQuery, status: 'SUCCESS' }).exec(),
      OrderHistory.countDocuments({ ...buyQuery, status: 'FAILED' }).exec(),
      OrderHistory.countDocuments({ ...buyQuery, status: 'PENDING' }).exec(),
      OrderHistory.countDocuments({ ...buyQuery, status: 'PARTIAL' }).exec(),
    ]);

    // Get SELL side stats
    const sellQuery = { ...query, side: 'SELL' };
    const [sellTotal, sellSuccess, sellFailed, sellPending, sellPartial] = await Promise.all([
      OrderHistory.countDocuments(sellQuery).exec(),
      OrderHistory.countDocuments({ ...sellQuery, status: 'SUCCESS' }).exec(),
      OrderHistory.countDocuments({ ...sellQuery, status: 'FAILED' }).exec(),
      OrderHistory.countDocuments({ ...sellQuery, status: 'PENDING' }).exec(),
      OrderHistory.countDocuments({ ...sellQuery, status: 'PARTIAL' }).exec(),
    ]);

    // Calculate percentages for BUY
    const buySuccessPercent = buyTotal > 0 ? (buySuccess / buyTotal) * 100 : 0;
    const buyFailedPercent = buyTotal > 0 ? (buyFailed / buyTotal) * 100 : 0;
    const buyPartialPercent = buyTotal > 0 ? (buyPartial / buyTotal) * 100 : 0;

    // Calculate percentages for SELL
    const sellSuccessPercent = sellTotal > 0 ? (sellSuccess / sellTotal) * 100 : 0;
    const sellFailedPercent = sellTotal > 0 ? (sellFailed / sellTotal) * 100 : 0;
    const sellPartialPercent = sellTotal > 0 ? (sellPartial / sellTotal) * 100 : 0;

    return {
      total,
      success,
      failed,
      pending,
      partial,
      buy: {
        total: buyTotal,
        success: buySuccess,
        failed: buyFailed,
        pending: buyPending,
        partial: buyPartial,
        successPercent: Math.round(buySuccessPercent * 100) / 100,
        failedPercent: Math.round(buyFailedPercent * 100) / 100,
        partialPercent: Math.round(buyPartialPercent * 100) / 100,
      },
      sell: {
        total: sellTotal,
        success: sellSuccess,
        failed: sellFailed,
        pending: sellPending,
        partial: sellPartial,
        successPercent: Math.round(sellSuccessPercent * 100) / 100,
        failedPercent: Math.round(sellFailedPercent * 100) / 100,
        partialPercent: Math.round(sellPartialPercent * 100) / 100,
      },
    };
  }
}

export default new OrderHistoryService();


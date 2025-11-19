import { Side } from '@polymarket/clob-client';
import { TradeData, TradeParams } from '@/types';
import logger from '@/utils/logger';
import ClobService from './clobService';
import OrderHistory from '@/models/OrderHistory';

/**
 * Execute a trade for a specific bot
 * Isolated execution - errors don't affect other bots
 */
const tradeExecutor = async (
    data: TradeData,
    params: TradeParams,
    privateKey: string,
    walletAddress: string,
    botId: string,
    userId: string,
    clobService: ClobService
): Promise<void> => {
    // Create order history record
    let orderHistory: any = null;
    const side = data.side ? Side.SELL : Side.BUY;
    const sideString = side === Side.BUY ? 'BUY' : 'SELL';

    try {
        // Create initial order history record
        orderHistory = new OrderHistory({
            botId,
            userId,
            status: 'PENDING',
            transactionHash: data.transactionHash,
            blockNumber: data.blockNumber,
            tokenId: data.tokenId,
            side: sideString,
            originalMakerAmount: typeof data.makerAmount === 'string' ? data.makerAmount : data.makerAmount.toString(),
            originalTakerAmount: typeof data.takerAmount === 'string' ? data.takerAmount : data.takerAmount.toString(),
            attemptCount: 0,
        });
        await orderHistory.save();

        logger.info(`[Bot ${botId}] New trade executing process for wallet ${walletAddress}:`, data);

        const tokenID = data.tokenId;
        const makerAmount = typeof data.makerAmount === 'string' ? parseFloat(data.makerAmount) : data.makerAmount;
        const takerAmount = typeof data.takerAmount === 'string' ? parseFloat(data.takerAmount) : data.takerAmount;
        
        // Calculate price
        let price = data.side
            ? takerAmount / makerAmount
            : makerAmount / takerAmount;
        
        // Calculate size based on bet size strategy
        let size: number;
        
        if (params.betSizeStrategy === 'FIX') {
            // Use fixed size strategy
            if (!params.fixedSize || params.fixedSize <= 0) {
                throw new Error('Fixed size strategy requires fixedSize to be set and greater than 0');
            }
            size = params.fixedSize;
        } else {
            // Use percentage strategy (PERCENTAGE)
            // Calculate size based on ratio of the original trade
            const originalSize = data.side 
                ? makerAmount / 1000000  // Convert from wei-like units
                : takerAmount / 1000000;
            
            size = originalSize * params.copyRatio;
            
            // Add small buffer to ensure order goes through
            size = size + 0.01;
        }

        // Apply minimum bet size constraint (user-defined minimum)
        if (size < params.minBetSize) {
            logger.info(`[Bot ${botId}] Size ${size} below minimum ${params.minBetSize}, adjusting to minimum`);
            size = params.minBetSize;
        }

        // Ensure minimum order value (system requirement: size * price >= 1)
        const minOrderValue = 1;
        if (size * price < minOrderValue) {
            const requiredSize = minOrderValue / price + 0.01;
            logger.info(`[Bot ${botId}] Order value ${size * price} below minimum ${minOrderValue}, adjusting size from ${size} to ${requiredSize}`);
            size = requiredSize;
        }

        // Apply maximum bet size constraint (user-defined maximum)
        if (size > params.maxBetSize) {
            logger.warn(`[Bot ${botId}] Size ${size} exceeds maximum ${params.maxBetSize}, capping to maximum`);
            size = params.maxBetSize;
            
            // Check if capped size still meets minimum order value
            if (size * price < minOrderValue) {
                const errorMsg = `Cannot meet minimum order value ${minOrderValue} with max bet size ${params.maxBetSize} at price ${price}`;
                logger.error(`[Bot ${botId}] ❌ ${errorMsg}`);
                throw new Error(errorMsg);
            }
        }

        logger.info(`[Bot ${botId}] side: ${side}, tokenID: ${tokenID}, price: ${price}, size: ${size}`);

        // Helper function to detect Cloudflare blocks
        const isCloudflareBlock = (response: any): boolean => {
            if (!response) return false;
            
            if (response.error && typeof response.error === 'string') {
                const errorStr = response.error.toLowerCase();
                return errorStr.includes('cloudflare') || 
                       errorStr.includes('attention required') ||
                       errorStr.includes('sorry, you have been blocked') ||
                       errorStr.includes('<!doctype html>');
            }
            
            if (typeof response === 'string' && response.toLowerCase().includes('cloudflare')) {
                return true;
            }
            
            return false;
        };

        const executeOrder = async (price: number, size: number, timeout: number, attempt: number): Promise<boolean> => {
            try {
                // Update attempt count
                orderHistory.attemptCount = attempt;
                await orderHistory.save();

                const response = await clobService.placeOrder(
                    tokenID,
                    price,
                    side,
                    size,
                    0, // feeRateBps
                    0  // nonce
                );
                
                logger.info(`[Bot ${botId}] Order response:`, response);

                // Update order history with order ID
                if (response && response.orderID) {
                    orderHistory.orderId = response.orderID;
                    orderHistory.executedPrice = price;
                    orderHistory.executedSize = size;
                    await orderHistory.save();
                }

                // Check for Cloudflare block
                if (isCloudflareBlock(response)) {
                    const errorMsg = 'Cloudflare blocked the request';
                    orderHistory.status = 'FAILED';
                    orderHistory.errorMessage = errorMsg;
                    orderHistory.errorCode = 'CLOUDFLARE_BLOCK';
                    orderHistory.executedAt = new Date();
                    await orderHistory.save();
                    
                    logger.error(`[Bot ${botId}] ❌ ${errorMsg}`);
                    return false;
                }

                if (!response || !response.success) {
                    const errorMsg = 'Order posting failed';
                    orderHistory.status = 'FAILED';
                    orderHistory.errorMessage = errorMsg;
                    orderHistory.errorCode = 'ORDER_POST_FAILED';
                    orderHistory.executedAt = new Date();
                    await orderHistory.save();
                    
                    logger.error(`[Bot ${botId}] Order posting failed. Response:`, response);
                    return false;
                }

                // Wait and check order status
                await new Promise((resolve) => setTimeout(resolve, timeout * 1500));
                const orderStatus = await clobService.getOrder(response.orderID);
                
                if (orderStatus.original_size === orderStatus.size_matched) {
                    // Order fully filled
                    orderHistory.status = 'SUCCESS';
                    orderHistory.executedAt = new Date();
                    await orderHistory.save();
                    
                    logger.info(`[Bot ${botId}] Order completed successfully 🎉:`, response.orderID);
                    return true;
                }

                // Partially filled - cancel and mark as partial
                await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
                await clobService.cancelOrder(response.orderID);
                
                orderHistory.status = 'PARTIAL';
                orderHistory.executedAt = new Date();
                await orderHistory.save();
                
                logger.info(`[Bot ${botId}] Order partially filled and canceled ❌:`, response.orderID);
                return false;
            } catch (error: any) {
                // Record error in order history
                orderHistory.status = 'FAILED';
                orderHistory.errorMessage = error.message || 'Unknown error during order execution';
                orderHistory.errorCode = error.code || 'EXECUTION_ERROR';
                orderHistory.executedAt = new Date();
                await orderHistory.save();
                
                logger.error(`[Bot ${botId}] Error during order execution ❗:`, error);
                return false;
            }
        };

        // Retry loop
        for (let attempt = 1; attempt <= params.retryLimit; attempt++) {
            logger.info(
                `[Bot ${botId}] ✅ Attempt ${attempt} of ${params.retryLimit} for price: ${price}, size: ${size}`
            );
            
            // Add delay between attempts to avoid rate limiting/Cloudflare blocks
            if (attempt > 1) {
                const delayMs = Math.min(1000 * attempt, 10000); // Max 10 seconds
                logger.info(`[Bot ${botId}] ⏳ Waiting ${delayMs / 1000}s before retry to avoid rate limits...`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
            
            if (await executeOrder(price, size, params.orderTimeout, attempt)) {
                return; // Success
            }
            
            // Adjust price for next attempt
            price = data.side
                ? price - params.orderIncrement / 100
                : price + params.orderIncrement / 100;
            
            if (price < 0) {
                orderHistory.status = 'FAILED';
                orderHistory.errorMessage = 'Price became negative after adjustments';
                orderHistory.errorCode = 'INVALID_PRICE';
                orderHistory.executedAt = new Date();
                await orderHistory.save();
                break;
            }
        }

        // All attempts failed
        if (orderHistory.status === 'PENDING') {
            orderHistory.status = 'FAILED';
            orderHistory.errorMessage = `All ${params.retryLimit} attempts failed`;
            orderHistory.errorCode = 'MAX_RETRIES_EXCEEDED';
            orderHistory.executedAt = new Date();
            await orderHistory.save();
        }
        
        logger.info(`[Bot ${botId}] 🔥 All ${params.retryLimit} attempts failed.`);
    } catch (error: any) {
        // Critical error - update order history if it exists
        if (orderHistory) {
            try {
                orderHistory.status = 'FAILED';
                orderHistory.errorMessage = error.message || 'Critical error in trade execution';
                orderHistory.errorCode = error.code || 'CRITICAL_ERROR';
                orderHistory.executedAt = new Date();
                await orderHistory.save();
            } catch (saveError) {
                logger.error(`[Bot ${botId}] Failed to save order history error:`, saveError);
            }
        }
        
        logger.error(`[Bot ${botId}] ❌ Critical error in tradeExecutor:`, error);
        // Re-throw to be caught by botManager (isolated error handling)
        throw error;
    }
};

export default tradeExecutor;

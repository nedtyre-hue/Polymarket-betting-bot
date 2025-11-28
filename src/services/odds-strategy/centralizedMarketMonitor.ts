import WebSocket from "ws";
import axios from "axios";
import { EventEmitter } from "events";
import logger from "@/utils/logger";
import StrategyOrderHistory from "@/models/StrategyOrderHistory";
import strategyBotStateManager, { IStrategyBotConfig } from "./strategyBotStateManager";
import { isCloudflareBlock } from "@/utils/helper";

const MARKET_CHANNEL = "market";
const WS_URL = "wss://ws-subscriptions-clob.polymarket.com";
const GAMMA_API_URL = "https://gamma-api.polymarket.com";

const MARKET_IDS = {
  BTC: "btc-updown-15m",
  ETH: "eth-updown-15m",
  SOL: "sol-updown-15m",
  XRP: "xrp-updown-15m",
};

interface MarketTokenIds {
  upTokenId: string;
  downTokenId: string;
}

interface MarketData {
  [market: string]: MarketTokenIds; // e.g., "BTC" -> { upTokenId, downTokenId }
}

/**
 * Centralized Market Monitor
 * Subscribes to all 4 markets and checks active bots when price events occur
 */
class CentralizedMarketMonitor extends EventEmitter {
  private ws: WebSocket | null = null;
  private currentMarketSlugs: Map<string, string> = new Map(); // market -> slug
  private marketTokenIds: MarketData = {}; // Store token IDs for each market
  private marketRotationCheckInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastPrices: Map<string, number> = new Map(); // tokenId -> lastPrice

  /**
   * Get current 15-minute UTC timestamp block
   */
  private getCurrent15mUTC(): number {
    const now = Math.floor(Date.now() / 1000);
    const FIFTEEN_MIN = 15 * 60;
    return Math.floor(now / FIFTEEN_MIN) * FIFTEEN_MIN;
  }

  /**
   * Get CLOB token IDs for a market slug
   */
  private async getClobTokenIds(slug: string): Promise<string[]> {
    try {
      const url = `${GAMMA_API_URL}/markets/slug/${slug}`;
      const res: any = await axios.get(url);
      const tokenIds = JSON.parse(res.data.clobTokenIds);
      return Array.isArray(tokenIds) ? tokenIds : [];
    } catch (err: any) {
      logger.error(`Error fetching market ${slug}:`, err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Get market slug for current 15-minute period
   */
  private getMarketSlug(marketSelection: "BTC" | "ETH" | "SOL" | "XRP"): string {
    const marketBase = MARKET_IDS[marketSelection];
    const timestamp = this.getCurrent15mUTC();
    return `${marketBase}-${timestamp}`;
  }

  /**
   * Check if any market has rotated to a new 15-minute period
   * Compares market slugs - if different, market has rotated
   */
  private async checkAndUpdateMarkets(): Promise<boolean> {
    let hasRotated = false;

    // Check each market by comparing current slug with previous slug
    for (const marketSelection of ["BTC", "ETH", "SOL", "XRP"] as const) {
      const currentSlug = this.getMarketSlug(marketSelection);
      const previousSlug = this.currentMarketSlugs.get(marketSelection);

      // If slug is different, market has rotated
      if (previousSlug && currentSlug !== previousSlug) {
        hasRotated = true;
        logger.info(`Market ${marketSelection} rotated: ${previousSlug} -> ${currentSlug}`);

        // Fetch new token IDs for the new market period
        const tokenIds = await this.getClobTokenIds(currentSlug);

        if (tokenIds.length >= 2) {
          this.marketTokenIds[marketSelection] = {
            upTokenId: tokenIds[0],
            downTokenId: tokenIds[1],
          };
          // Update the slug BEFORE the next check to prevent re-detection
          this.currentMarketSlugs.set(marketSelection, currentSlug);
          logger.info(
            `Market ${marketSelection} token IDs updated: UP=${tokenIds[0]}, DOWN=${tokenIds[1]}`
          );
        } else {
          logger.warn(`Market ${marketSelection} returned insufficient token IDs: ${tokenIds.length}`);
          // Don't update slug if we didn't get valid token IDs
        }
      } else if (!previousSlug) {
        // First time initializing this market (should only happen on startup)
        const tokenIds = await this.getClobTokenIds(currentSlug);
        if (tokenIds.length >= 2) {
          this.marketTokenIds[marketSelection] = {
            upTokenId: tokenIds[0],
            downTokenId: tokenIds[1],
          };
          this.currentMarketSlugs.set(marketSelection, currentSlug);
          logger.info(
            `Market ${marketSelection} initialized: UP=${tokenIds[0]}, DOWN=${tokenIds[1]}, slug=${currentSlug}`
          );
        }
      } else {
        // Slugs match - no rotation
        logger.debug(`Market ${marketSelection} unchanged: ${currentSlug}`);
      }
    }

    return hasRotated;
  }

  /**
   * Initialize all markets (fetch token IDs for current period)
   */
  private async initializeMarkets(): Promise<void> {
    logger.info("Initializing all markets...");

    for (const marketSelection of ["BTC", "ETH", "SOL", "XRP"] as const) {
      try {
        const slug = this.getMarketSlug(marketSelection);
        const tokenIds = await this.getClobTokenIds(slug);

        if (tokenIds.length >= 2) {
          this.marketTokenIds[marketSelection] = {
            upTokenId: tokenIds[0],
            downTokenId: tokenIds[1],
          };
          this.currentMarketSlugs.set(marketSelection, slug);
          logger.info(
            `Market ${marketSelection} initialized: UP=${tokenIds[0]}, DOWN=${tokenIds[1]}, slug=${slug}`
          );
        } else {
          logger.warn(`Market ${marketSelection} returned insufficient token IDs: ${tokenIds.length}`);
        }
      } catch (error) {
        logger.error(`Error initializing market ${marketSelection}:`, error);
      }
    }
  }

  /**
   * Get all token IDs to subscribe to
   */
  private getAllTokenIds(): string[] {
    const allTokenIds: string[] = [];
    for (const marketData of Object.values(this.marketTokenIds)) {
      allTokenIds.push(marketData.upTokenId, marketData.downTokenId);
    }
    return allTokenIds;
  }

  /**
   * Connect to WebSocket and subscribe to all markets
   */
  private async connectWebSocket(): Promise<void> {
    try {
      // Initialize markets first
      await this.initializeMarkets();

      const allTokenIds = this.getAllTokenIds();
      if (allTokenIds.length === 0) {
        logger.error("No token IDs available to subscribe");
        return;
      }

      logger.info(`Connecting to WebSocket with ${allTokenIds.length} token IDs`);

      // Close existing connection if any
      if (this.ws) {
        this.ws.close(1001, "market rotation");
      }

      // Create new WebSocket connection
      const wsUrl = `${WS_URL}/ws/${MARKET_CHANNEL}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => this.onWebSocketOpen());
      this.ws.on("message", (msg: any) => this.onWebSocketMessage(msg.toString()));
      this.ws.on("error", (err) => {
        logger.error("WebSocket Error:", err);
        this.emit("error", err);
      });
      this.ws.on("close", (code: number, reason: string) => {
        logger.warn(`WebSocket Closed: ${code} ${reason}`);
        // Attempt to reconnect if still running
        if (this.isRunning && code !== 1001) {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      });
    } catch (error) {
      logger.error("Error connecting WebSocket:", error);
      this.emit("error", error);
    }
  }

  /**
   * Handle WebSocket open event
   */
  private onWebSocketOpen(): void {
    logger.info("WebSocket Connected");

    // Subscribe to all markets
    const allTokenIds = this.getAllTokenIds();
    const subMsg = {
      type: "subscribe",
      assets_ids: allTokenIds,
    };

    this.ws?.send(JSON.stringify(subMsg));
    logger.info(`Subscribed to ${allTokenIds.length} tokens across all markets`);

    // Start ping to keep connection alive
    this.startPing();
  }

  /**
   * Handle WebSocket messages
   */
  private onWebSocketMessage(raw: string): void {
    try {
      // Handle PONG responses
      if (raw === "PONG") {
        return;
      }

      const msg = JSON.parse(raw);
      const eventType = msg.event_type;

      // Monitor for last_trade_price events
      if (eventType === "last_trade_price") {
        this.handlePriceChange(msg);
      }
    } catch (error) {
      // Ignore non-JSON messages
      if (raw !== "PONG") {
        logger.info("Non-JSON message:", raw);
      }
    }
  }

  /**
   * Handle last_trade_price event from WebSocket
   * Format: { event_type: "last_trade_price", asset_id, price, side, ... }
   */
  private handlePriceChange(msg: any): void {
    try {
      // Extract fields directly from message (last_trade_price is a single object, not an array)
      const tokenId = msg.asset_id;
      const priceStr = msg.price;
      const side = msg.side;

      if (side === "SELL") return;

      if (!tokenId || !priceStr) {
        return;
      }

      // Price from WebSocket is already in decimal format (0-1)
      const price = parseFloat(priceStr);

      // Update last price for this token (store in decimal format)
      this.lastPrices.set(tokenId, price);

      // Find which market this token belongs to and determine if it's UP or DOWN
      let marketSelection: "BTC" | "ETH" | "SOL" | "XRP" | null = null;
      let marketType: "UP" | "DOWN" | null = null;

      for (const [market, marketData] of Object.entries(this.marketTokenIds)) {
        if (marketData.upTokenId === tokenId) {
          marketSelection = market as "BTC" | "ETH" | "SOL" | "XRP";
          marketType = "UP";
          break;
        } else if (marketData.downTokenId === tokenId) {
          marketSelection = market as "BTC" | "ETH" | "SOL" | "XRP";
          marketType = "DOWN";
          break;
        }
      }

      if (!marketSelection || !marketType) {
        logger.info(`Token ${tokenId} not found in any market`);
        return;
      }

      // logger.info(`Price change: ${marketSelection} ${marketType} token = ${price} cents`);

      // Check all active bots for this market
      this.checkAndExecuteBots(marketSelection, "BUY", tokenId, price);
    } catch (error) {
      logger.error("Error handling price change:", error);
    }
  }

  /**
   * Check active bots and execute orders for matching conditions
   */
  private async checkAndExecuteBots(
    marketSelection: "BTC" | "ETH" | "SOL" | "XRP",
    side: "BUY" | "SELL",
    tokenId: string,
    price: number
  ): Promise<void> {
    // Get all bots monitoring this market
    const botConfigs = strategyBotStateManager.getStrategyBotConfigsByMarket(marketSelection);

    for (const config of botConfigs) {
      // Skip if bot has already triggered for this market period
      if (config.hasTriggered) {
        continue;
      }

      // Convert triggerPrice from cents (0-100) to decimal (0-1) for comparison
      const triggerPriceDecimal = config.settings.triggerPrice / 100;
      
      // Check if trigger price is reached
      if ((triggerPriceDecimal - 0.025) <= price && price <= (triggerPriceDecimal + 0.025)) {
        // Set trigger flag BEFORE executing order to prevent multiple triggers
        config.hasTriggered = true;
        logger.info(
          `[StrategyBot ${config.botId}] ${marketSelection} 🎯 Trigger price reached! ${side} token at ${price} (trigger: ${triggerPriceDecimal})`
        );

        // Execute buy order (don't await - let them run in parallel)
        // Note: hasTriggered is already set, so even if price matches again, it won't execute
        this.placeBuyOrder(config, tokenId, side, price).catch((error) => {
          logger.error(`[StrategyBot ${config.botId}] Error placing buy order:`, error);
          // On error, we could potentially reset hasTriggered, but for now we keep it set
          // to prevent repeated failures in the same period
        });
      }
    }
  }

  /**
   * Place buy order for a bot
   */
  private async placeBuyOrder(
    config: IStrategyBotConfig,
    tokenId: string,
    side: "BUY" | "SELL",
    lastPrice: number
  ): Promise<void> {
    try {
      // lastPrice is in decimal format (0-1), consistent with tradeExecutor.ts
      // Determine order price based on trade type
      let orderPrice: number;
      if (config.settings.tradeType === "MARKET") {
        // For market orders, use a slightly higher price to ensure execution
        // Add 0.01 (1 cent in decimal) and cap at 1.0
        orderPrice = Math.min(lastPrice + 0.01, 1.0);
      } else {
        // For limit orders, convert limitPrice from cents (0-100) to decimal (0-1)
        if (!config.settings.limitPrice || config.settings.limitPrice < 0 || config.settings.limitPrice > 100) {
          logger.error(`[StrategyBot ${config.botId}] Invalid limit price: ${config.settings.limitPrice}`);
          return;
        }
        orderPrice = config.settings.limitPrice / 100;
      }

      const orderSize = config.settings.fixedSize;

      logger.info(
        `[StrategyBot ${config.botId}] Placing ${config.settings.tradeType} BUY order: ${orderSize} shares at ${orderPrice}`
      );

      // Calculate total cost: size * price (in decimal)
      const totalCost = orderSize * orderPrice;

      // Create order history record
      // Note: transactionHash and blockNumber are not available for strategy bots
      // since orders are placed directly on CLOB, not from blockchain events
      const orderHistory = new StrategyOrderHistory({
        botId: config.bot._id,
        userId: config.bot.userId,
        status: "PENDING",
        transactionHash: null, // Not available for strategy bot orders
        blockNumber: 0, // Not available for strategy bot orders
        tokenId,
        side: "BUY",
        originalMakerAmount: orderSize.toString(),
        originalTakerAmount: totalCost.toString(),
        attemptCount: 1,
      });
      await orderHistory.save();

      // Place order with retry logic
      let success = false;
      let currentOrderPrice = orderPrice; // Track price in decimal format
      for (let attempt = 1; attempt <= config.settings.retryLimit; attempt++) {
        try {
          orderHistory.attemptCount = attempt;
          await orderHistory.save();

          const response = await config.clobService.placeOrder(
            tokenId,
            currentOrderPrice, // Pass decimal price to CLOB client
            "BUY",
            orderSize,
            0, // feeRateBps
            0  // nonce
          );

          logger.info(`[StrategyBot ${config.botId}] Order response (attempt ${attempt}):`, response);

          if (response && response.orderID) {
            orderHistory.orderId = response.orderID;
            orderHistory.executedPrice = currentOrderPrice; // Store in decimal format (consistent with tradeExecutor)
            orderHistory.executedSize = orderSize;
            await orderHistory.save();
          }

          if (isCloudflareBlock(response)) {
            const errorMsg = 'Cloudflare blocked the request';
            orderHistory.status = 'FAILED';
            orderHistory.errorMessage = errorMsg;
            orderHistory.errorCode = 'CLOUDFLARE_BLOCK';
            orderHistory.executedAt = new Date();
            await orderHistory.save();
            
            logger.error(`[StrategyBot ${config.botId}] ❌ ${errorMsg}`);
            break;
          }

          if (!response || !response.success) {
            const errorMsg = response?.error || "Order posting failed";
            logger.warn(`[StrategyBot ${config.botId}] Order failed (attempt ${attempt}): ${errorMsg}`);

            if (attempt < config.settings.retryLimit) {
              // Wait before retry
              await new Promise((resolve) => setTimeout(resolve, config.settings.timeout * 1000));
              // Adjust price for next attempt
              // increment is in cents, convert to decimal (divide by 100) and add
              currentOrderPrice = Math.min(currentOrderPrice + config.settings.increment / 100, 1.0);
              continue;
            } else {
              orderHistory.status = "FAILED";
              orderHistory.errorMessage = errorMsg;
              orderHistory.errorCode = "ORDER_POST_FAILED";
              orderHistory.executedAt = new Date();
              await orderHistory.save();
              return;
            }
          }

          // Wait and check order status
          await new Promise((resolve) => setTimeout(resolve, config.settings.timeout * 1500));
          const orderStatus = await config.clobService.getOrder(response.orderID);

          if (orderStatus.original_size === orderStatus.size_matched) {
            // Order fully filled
            orderHistory.status = "SUCCESS";
            orderHistory.executedAt = new Date();
            await orderHistory.save();
            logger.info(`[StrategyBot ${config.botId}] ✅ Order completed successfully: ${response.orderID}`);
            success = true;
            this.emit("orderFilled", {
              botId: config.botId,
              orderId: response.orderID,
              tokenId,
              side,
              price: currentOrderPrice, // Emit in decimal format
              size: orderSize,
            });
            break;
          } else {
            // Partially filled - cancel remaining
            const filledSize = Number(orderStatus.size_matched);
            const remainingSize = Number(orderStatus.original_size ?? 0) - filledSize;
            logger.info(
              `[StrategyBot ${config.botId}] Order partially filled: ${filledSize}/${orderStatus.original_size}, remaining: ${remainingSize}`
            );

            await new Promise((resolve) => setTimeout(resolve, config.settings.timeout * 1000));
            await config.clobService.cancelOrder(response.orderID);

            orderHistory.status = "PARTIAL";
            orderHistory.executedAt = new Date();
            await orderHistory.save();
            logger.info(`[StrategyBot ${config.botId}] Order partially filled and canceled: ${response.orderID}`);
            success = true; // Consider partial as success for now
            break;
          }
        } catch (error: any) {
          logger.error(`[StrategyBot ${config.botId}] Error during order execution (attempt ${attempt}):`, error);

          if (attempt === config.settings.retryLimit) {
            orderHistory.status = "FAILED";
            orderHistory.errorMessage = error.message || "Unknown error during order execution";
            orderHistory.errorCode = error.code || "EXECUTION_ERROR";
            orderHistory.executedAt = new Date();
            await orderHistory.save();
          } else {
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, config.settings.timeout * 1000));
            // Adjust price for next attempt
            // increment is in cents, convert to decimal (divide by 100) and add
            currentOrderPrice = Math.min(currentOrderPrice + config.settings.increment / 100, 1.0);
          }
        }
      }

      if (!success) {
        logger.error(`[StrategyBot ${config.botId}] ❌ All ${config.settings.retryLimit} attempts failed`);
      }
    } catch (error) {
      logger.error(`[StrategyBot ${config.botId}] Error placing buy order:`, error);
      this.emit("error", { botId: config.botId, error });
    }
  }

  /**
   * Start ping to keep WebSocket connection alive
   */
  private startPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("PING");
      }
    }, 10_000);
  }

  /**
   * Start monitoring market rotation
   * Checks every 30 seconds by comparing current market slugs with previous ones
   */
  private startMarketRotationCheck(): void {
    if (this.marketRotationCheckInterval) {
      clearInterval(this.marketRotationCheckInterval);
    }

    // Check every 30 seconds if markets have rotated (by comparing slugs)
    this.marketRotationCheckInterval = setInterval(async () => {
      try {
        const hasRotated = await this.checkAndUpdateMarkets();
        if (hasRotated) {
          logger.info("Market rotation detected, re-registering socket and resetting triggers...");
          // Reset trigger flags for all bots (new market period)
          strategyBotStateManager.resetTriggerFlags();
          // Reconnect WebSocket with new token IDs
          await this.connectWebSocket();
        }
      } catch (error) {
        logger.error("Error checking market rotation:", error);
      }
    }, 30_000);
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Centralized market monitor already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting centralized odds strategy market monitor");

    // Connect to WebSocket
    await this.connectWebSocket();

    // Start market rotation check
    this.startMarketRotationCheck();

    this.emit("started");
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info("Stopping centralized odds strategy market monitor");

    // Clear intervals
    if (this.marketRotationCheckInterval) {
      clearInterval(this.marketRotationCheckInterval);
      this.marketRotationCheckInterval = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1001, "stopping market monitor");
      this.ws = null;
    }

    this.emit("stopped");
  }

  /**
   * Check if monitor is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export default new CentralizedMarketMonitor();


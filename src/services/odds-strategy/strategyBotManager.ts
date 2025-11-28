import { EventEmitter } from "events";
import logger from "@/utils/logger";
import StrategyBot from "@/models/StrategyBot";
import { IStrategyBotDocument } from "@/types";
import centralizedMarketMonitor from "./centralizedMarketMonitor";
import strategyBotStateManager from "./strategyBotStateManager";

/**
 * Strategy Bot Manager
 * Manages odds strategy bot lifecycle and market monitoring
 */
class StrategyBotManager extends EventEmitter {
  private isInitialized = false;

  /**
   * Initialize the strategy bot manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn("StrategyBotManager already initialized");
      return;
    }

    logger.info("🎯 Initializing Strategy Bot Manager...");

    try {
      // Start centralized market monitor (subscribes to all 4 markets)
      await centralizedMarketMonitor.start();

      // Set up event handlers for centralized monitor
      centralizedMarketMonitor.on("started", () => {
        logger.info("✅ Centralized market monitor started");
      });

      centralizedMarketMonitor.on("stopped", () => {
        logger.info("🛑 Centralized market monitor stopped");
      });

      centralizedMarketMonitor.on("error", (error) => {
        logger.error("❌ Centralized market monitor error:", error);
        this.emit("monitorError", { error });
      });

      centralizedMarketMonitor.on("orderFilled", (data) => {
        logger.info("✅ Order filled:", data);
        this.emit("orderFilled", data);
      });

      // Load and add all running strategy bots to state
      await this.loadAndAddStrategyBots();
      this.isInitialized = true;
      logger.info("✅ Strategy Bot Manager initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize Strategy Bot Manager:", error);
      throw error;
    }
  }

  /**
   * Load and add all running strategy bots to state
   */
  private async loadAndAddStrategyBots(): Promise<void> {
    try {
      const runningBots = await StrategyBot.find({ status: "RUNNING" }).exec();
      logger.info(`📊 Found ${runningBots.length} running strategy bots`);

      for (const bot of runningBots) {
        try {
          strategyBotStateManager.addStrategyBot(bot);
          logger.info(`✅ Added strategy bot ${bot._id} to state`);
        } catch (error) {
          logger.error(`❌ Failed to add strategy bot ${bot._id} to state:`, error);
          // Update bot status to ERROR
          bot.status = "ERROR";
          bot.errorMessage = error instanceof Error ? error.message : "Failed to add to state";
          await bot.save();
        }
      }
    } catch (error) {
      logger.error("❌ Error loading strategy bots:", error);
      throw error;
    }
  }

  /**
   * Add strategy bot to state (for centralized monitoring)
   */
  addStrategyBotToState(bot: IStrategyBotDocument): void {
    const botId = bot._id.toString();
    try {
      strategyBotStateManager.addStrategyBot(bot);
      logger.info(`✅ Added strategy bot ${botId} to state`);
      this.emit("botAdded", { botId });
    } catch (error) {
      logger.error(`❌ Failed to add strategy bot ${botId} to state:`, error);
      throw error;
    }
  }

  /**
   * Remove strategy bot from state
   */
  removeStrategyBotFromState(botId: string): void {
    try {
      strategyBotStateManager.removeStrategyBot(botId);
      logger.info(`🗑️  Removed strategy bot ${botId} from state`);
      this.emit("botRemoved", { botId });
    } catch (error) {
      logger.error(`❌ Failed to remove strategy bot ${botId} from state:`, error);
      throw error;
    }
  }

  /**
   * Handle strategy bot created event
   */
  async handleStrategyBotCreated(bot: IStrategyBotDocument): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (bot.status === "RUNNING") {
        logger.info(`🆕 Strategy bot created with RUNNING status: ${bot._id}, adding to state...`);
        this.addStrategyBotToState(bot);
      } else {
        logger.info(`ℹ️  Strategy bot created with status ${bot.status}: ${bot._id}, not adding to state`);
      }
    } catch (error) {
      logger.error(`❌ Failed to handle strategy bot creation for ${bot._id}:`, error);
    }
  }

  /**
   * Handle strategy bot updated event
   */
  async handleStrategyBotUpdated(bot: IStrategyBotDocument): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const botId = bot._id.toString();
      const existingConfig = strategyBotStateManager.getStrategyBotConfig(botId);

      if (bot.status === "RUNNING") {
        if (existingConfig) {
          // Bot exists in state, update it (remove and re-add to refresh config)
          logger.info(`🔄 Strategy bot ${botId} updated, refreshing state...`);
          this.removeStrategyBotFromState(botId);
          this.addStrategyBotToState(bot);
        } else {
          // Bot not in state but now RUNNING, add it
          logger.info(`🆕 Strategy bot ${botId} status changed to RUNNING, adding to state...`);
          this.addStrategyBotToState(bot);
        }
      } else {
        // Bot status is not RUNNING, remove from state if it exists
        if (existingConfig) {
          logger.info(`🛑 Strategy bot ${botId} status changed to ${bot.status}, removing from state...`);
          this.removeStrategyBotFromState(botId);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to handle strategy bot update for ${bot._id}:`, error);
    }
  }

  /**
   * Handle strategy bot deleted event
   */
  handleStrategyBotDeleted(botId: string): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      const existingConfig = strategyBotStateManager.getStrategyBotConfig(botId);
      if (existingConfig) {
        logger.info(`🗑️  Strategy bot ${botId} deleted, removing from state...`);
        this.removeStrategyBotFromState(botId);
      }
    } catch (error) {
      logger.error(`❌ Failed to handle strategy bot deletion for ${botId}:`, error);
    }
  }

  /**
   * Update bot error status in database
   */
  private async updateBotErrorStatus(botId: string, errorMessage: string): Promise<void> {
    try {
      const bot = await StrategyBot.findById(botId).exec();
      if (bot) {
        bot.status = "ERROR";
        bot.errorMessage = errorMessage;
        await bot.save();
      }
    } catch (error) {
      logger.error(`[StrategyBot ${botId}] Failed to update error status:`, error);
    }
  }

  /**
   * Get status of all monitored strategy bots
   */
  getStatus(): { total: number; monitorRunning: boolean; bots: Array<{ botId: string }> } {
    const botConfigs = strategyBotStateManager.getAllStrategyBotConfigs();
    const bots = botConfigs.map((config) => ({
      botId: config.botId,
    }));

    return {
      total: bots.length,
      monitorRunning: centralizedMarketMonitor.getIsRunning(),
      bots,
    };
  }

  /**
   * Shutdown the strategy bot manager
   */
  async shutdown(): Promise<void> {
    logger.info("🛑 Shutting down Strategy Bot Manager...");

    // Stop centralized market monitor
    await centralizedMarketMonitor.stop();

    // Clear all bot configs from state
    strategyBotStateManager.clear();

    this.isInitialized = false;
    logger.info("✅ Strategy Bot Manager shut down");
  }
}

export default new StrategyBotManager();


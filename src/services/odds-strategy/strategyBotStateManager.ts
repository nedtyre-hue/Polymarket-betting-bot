import { IStrategyBotDocument } from "@/types";
import ClobService from "../clobService";
import { decrypt } from "@/utils/encryption";
import { CLOB_HTTP_URL } from "@/config/constants";

/**
 * Strategy Bot Configuration
 */
export interface IStrategyBotConfig {
  botId: string;
  bot: IStrategyBotDocument;
  clobService: ClobService;
  settings: IStrategyBotDocument["oddsStrategySettings"];
  wallet: string;
  hasTriggered: boolean; // Track if bot has already triggered for current market period
}

/**
 * Strategy Bot State Manager
 * Manages active strategy bot configurations in memory
 */
class StrategyBotStateManager {
  private botConfigs: Map<string, IStrategyBotConfig> = new Map();

  /**
   * Add a strategy bot to state
   */
  addStrategyBot(bot: IStrategyBotDocument): void {
    const botId = bot._id.toString();

    // Decrypt private key and create CLOB service
    const privateKey = decrypt(bot.privateKey);
    const clobService = new ClobService(CLOB_HTTP_URL, privateKey, bot.wallet.toLowerCase());

    const config: IStrategyBotConfig = {
      botId,
      bot,
      clobService,
      settings: bot.oddsStrategySettings,
      wallet: bot.wallet.toLowerCase(),
      hasTriggered: false, // Reset trigger flag
    };

    this.botConfigs.set(botId, config);
  }

  /**
   * Remove a strategy bot from state
   */
  removeStrategyBot(botId: string): void {
    this.botConfigs.delete(botId);
  }

  /**
   * Get strategy bot config by ID
   */
  getStrategyBotConfig(botId: string): IStrategyBotConfig | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * Get all strategy bot configs
   */
  getAllStrategyBotConfigs(): IStrategyBotConfig[] {
    return Array.from(this.botConfigs.values());
  }

  /**
   * Get strategy bot configs by market selection
   */
  getStrategyBotConfigsByMarket(marketSelection: "BTC" | "ETH" | "SOL" | "XRP"): IStrategyBotConfig[] {
    return Array.from(this.botConfigs.values()).filter(
      (config) => config.settings.marketSelection === marketSelection
    );
  }

  /**
   * Get all active strategy bot configs (for running bots)
   */
  getActiveStrategyBotConfigs(): IStrategyBotConfig[] {
    return Array.from(this.botConfigs.values());
  }

  /**
   * Reset trigger flag for all bots (called when market rotates)
   */
  resetTriggerFlags(): void {
    this.botConfigs.forEach((config) => {
      config.hasTriggered = false;
    });
  }

  /**
   * Clear all bot configs
   */
  clear(): void {
    this.botConfigs.clear();
  }

  /**
   * Get count of active bots
   */
  getCount(): number {
    return this.botConfigs.size;
  }
}

export default new StrategyBotStateManager();


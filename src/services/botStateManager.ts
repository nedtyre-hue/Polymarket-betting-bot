import { IBotDocument } from '@/types';
import { decrypt } from '@/utils/encryption';
import ClobService from './clobService';
import { CLOB_HTTP_URL } from '@/config/constants';
import logger from '@/utils/logger';

/**
 * Bot Configuration stored in global state
 */
export interface BotConfig {
  botId: string;
  bot: IBotDocument;
  privateKey: string; // Decrypted
  wallet: string;
  copyTradingWallet: string;
  copyTradingWalletContractAddress: string;
  clobService: ClobService;
  settings: IBotDocument['settings'];
}

/**
 * Global Bot State Manager
 * Manages all running bot configurations in memory
 */
class BotStateManager {
  // Map of botId -> BotConfig
  private botConfigs: Map<string, BotConfig> = new Map();
  
  // Set of unique contract addresses to monitor
  private contractAddresses: Set<string> = new Set();
  
  // Map of targetWallet -> botIds that monitor it
  private targetWalletMap: Map<string, Set<string>> = new Map();

  /**
   * Add or update a bot configuration
   */
  async addBot(bot: IBotDocument): Promise<void> {
    try {
      const botId = bot._id.toString();
      
      // Decrypt private key
      const privateKey = decrypt(bot.privateKey);
      
      // Verify wallet matches private key
      const { ethers } = await import('ethers');
      const { RPC_URL } = await import('@/config/constants');
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const walletFromKey = new ethers.Wallet(privateKey, provider);
      const addressFromKey = walletFromKey.address.toLowerCase();
      
      if (addressFromKey !== bot.wallet.toLowerCase()) {
        throw new Error(`Wallet address mismatch for bot ${botId}. Expected ${bot.wallet}, got ${addressFromKey}`);
      }

      // Create ClobService for this bot
      const clobService = new ClobService(CLOB_HTTP_URL, privateKey);

      // Create bot config
      const config: BotConfig = {
        botId,
        bot,
        privateKey,
        wallet: bot.wallet.toLowerCase(),
        copyTradingWallet: bot.copyTradingWallet.toLowerCase(),
        copyTradingWalletContractAddress: bot.copyTradingWalletContractAddress.toLowerCase(),
        clobService,
        settings: bot.settings,
      };

      // Update maps
      this.botConfigs.set(botId, config);
      this.contractAddresses.add(config.copyTradingWalletContractAddress);
      
      // Update target wallet map
      if (!this.targetWalletMap.has(config.copyTradingWallet)) {
        this.targetWalletMap.set(config.copyTradingWallet, new Set());
      }
      this.targetWalletMap.get(config.copyTradingWallet)!.add(botId);

      logger.info(`✅ Added bot ${botId} (${bot.name}) to state manager`);
    } catch (error) {
      logger.error(`❌ Failed to add bot ${bot._id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a bot configuration
   */
  removeBot(botId: string): void {
    const config = this.botConfigs.get(botId);
    if (!config) {
      return;
    }

    // Remove from maps
    this.botConfigs.delete(botId);
    
    // Remove from target wallet map
    const walletSet = this.targetWalletMap.get(config.copyTradingWallet);
    if (walletSet) {
      walletSet.delete(botId);
      if (walletSet.size === 0) {
        this.targetWalletMap.delete(config.copyTradingWallet);
      }
    }

    // Check if contract address is still needed
    let contractStillNeeded = false;
    for (const [_, cfg] of this.botConfigs.entries()) {
      if (cfg.copyTradingWalletContractAddress === config.copyTradingWalletContractAddress) {
        contractStillNeeded = true;
        break;
      }
    }
    
    if (!contractStillNeeded) {
      this.contractAddresses.delete(config.copyTradingWalletContractAddress);
    }

    logger.info(`🗑️  Removed bot ${botId} from state manager`);
  }

  /**
   * Update bot configuration (for when settings change)
   */
  async updateBot(bot: IBotDocument): Promise<void> {
    const botId = bot._id.toString();
    const existing = this.botConfigs.get(botId);
    
    if (!existing) {
      // Bot not in state, add it
      await this.addBot(bot);
      return;
    }

    // Check if critical fields changed
    const privateKeyChanged = bot.privateKey !== existing.bot.privateKey;
    const walletChanged = bot.wallet.toLowerCase() !== existing.wallet;
    const contractChanged = bot.copyTradingWalletContractAddress.toLowerCase() !== existing.copyTradingWalletContractAddress;
    const targetWalletChanged = bot.copyTradingWallet.toLowerCase() !== existing.copyTradingWallet;

    if (privateKeyChanged || walletChanged || contractChanged || targetWalletChanged) {
      // Need to recreate the bot config
      this.removeBot(botId);
      await this.addBot(bot);
    } else {
      // Just update settings and bot document
      existing.settings = bot.settings;
      existing.bot = bot;
      logger.info(`🔄 Updated settings for bot ${botId}`);
    }
  }

  /**
   * Get bot config by ID
   */
  getBotConfig(botId: string): BotConfig | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * Get bot configs by target wallet
   */
  getBotConfigsByTargetWallet(targetWallet: string): BotConfig[] {
    const botIds = this.targetWalletMap.get(targetWallet.toLowerCase());
    if (!botIds || botIds.size === 0) {
      return [];
    }
    
    return Array.from(botIds)
      .map(botId => this.botConfigs.get(botId))
      .filter((config): config is BotConfig => config !== undefined);
  }

  /**
   * Get all contract addresses to monitor
   */
  getContractAddresses(): string[] {
    return Array.from(this.contractAddresses);
  }

  /**
   * Get all target wallets
   */
  getTargetWallets(): string[] {
    return Array.from(this.targetWalletMap.keys());
  }

  /**
   * Get all bot configs
   */
  getAllBotConfigs(): BotConfig[] {
    return Array.from(this.botConfigs.values());
  }

  /**
   * Get count of active bots
   */
  getBotCount(): number {
    return this.botConfigs.size;
  }

  /**
   * Clear all bot configs
   */
  clear(): void {
    this.botConfigs.clear();
    this.contractAddresses.clear();
    this.targetWalletMap.clear();
    logger.info('🧹 Cleared all bot configs from state manager');
  }
}

export default new BotStateManager();


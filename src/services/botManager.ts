import { EventEmitter } from 'events';
import { IBotDocument } from '@/types';
import Bot from '@/models/Bot';
import { checkUSDCAllowance, approveUSDC } from '@/utils/helper';
import { CLOB_CONTRACT_ADDRESSES } from '@/config/constants';
import logger from '@/utils/logger';
import botStateManager from './botStateManager';
import tradeMonitor from './tradeMonitor';
import tradeExecutor from './tradeExecutor';
import { decrypt } from '@/utils/encryption';

/**
 * Bot Manager Service
 * Manages bot configurations in global state and routes transactions
 */
class BotManager extends EventEmitter {
  private isInitialized = false;

  /**
   * Initialize the bot manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('BotManager already initialized');
      return;
    }

    logger.info('🤖 Initializing Bot Manager...');
    
    try {
      // Load and start all running bots
      await this.loadAndStartBots();
      
      // Set up transaction routing from tradeMonitor
      this.setupTransactionRouting();
      
      // Start the single tradeMonitor instance
      if (!tradeMonitor.getIsRunning()) {
        await tradeMonitor.start();
      }
      
      this.isInitialized = true;
      logger.info('✅ Bot Manager initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Bot Manager:', error);
      throw error;
    }
  }

  /**
   * Set up transaction routing from tradeMonitor to appropriate bots
   */
  private setupTransactionRouting(): void {
    tradeMonitor.on('transaction', async (tradeData: any) => {
      try {
        // Get all bot configs that monitor this target wallet
        const makerAddress = tradeData.makerAddress.toLowerCase();
        const botConfigs = botStateManager.getBotConfigsByTargetWallet(makerAddress);

        if (botConfigs.length === 0) {
          // No bots monitoring this wallet, skip
          return;
        }

        // Execute trade for each bot that monitors this wallet
        // Each bot executes independently - errors are isolated
        const executionPromises = botConfigs.map(async (config) => {
          try {
            await this.executeTradeForBot(config, tradeData);
          } catch (error) {
            // Isolated error handling - one bot failure doesn't affect others
            logger.error(`❌ Error executing trade for bot ${config.botId}:`, error);
            this.emit('botTradeError', { botId: config.botId, error, tradeData });
          }
        });

        // Execute all bots in parallel (isolated)
        await Promise.allSettled(executionPromises);
      } catch (error) {
        logger.error('❌ Error in transaction routing:', error);
      }
    });

    tradeMonitor.on('error', (error) => {
      logger.error('TradeMonitor error:', error);
      this.emit('monitorError', { error });
    });

    tradeMonitor.on('maxReconnectReached', () => {
      logger.error('TradeMonitor max reconnection attempts reached');
      this.emit('monitorMaxReconnectReached');
    });
  }

  /**
   * Execute trade for a specific bot (isolated execution)
   */
  private async executeTradeForBot(config: any, tradeData: any): Promise<void> {
    const { botId, bot, clobService, settings, wallet } = config;

    // Convert bot settings to TradeParams
    const tradeParams = {
      targetWallet: config.copyTradingWallet,
      copyRatio: settings.ratio,
      retryLimit: settings.retryLimit,
      orderIncrement: settings.increment,
      orderTimeout: settings.timeout,
      betSizeStrategy: settings.betSizeStrategy,
      fixedSize: settings.fixedSize,
      minBetSize: settings.minBetSize,
      maxBetSize: settings.maxBetSize,
    };

    // Execute trade with bot-specific configuration
    await tradeExecutor(
      tradeData,
      tradeParams,
      config.privateKey,
      wallet,
      botId,
      bot.userId.toString(),
      clobService
    );
  }

  /**
   * Load all RUNNING bots from database and add to global state
   */
  private async loadAndStartBots(): Promise<void> {
    try {
      const runningBots = await Bot.find({ status: 'RUNNING' }).exec();
      
      logger.info(`📊 Found ${runningBots.length} RUNNING bot(s)`);
      
      if (runningBots.length === 0) {
        logger.info('⚠️  No running bots found. Bot Manager will wait for bots to be started.');
        return;
      }

      // Process each bot
      for (const bot of runningBots) {
        try {
          await this.addBotToState(bot);
        } catch (error) {
          logger.error(`❌ Failed to add bot ${bot._id} to state:`, error);
          // Continue with other bots even if one fails
        }
      }
    } catch (error) {
      logger.error('❌ Error loading bots:', error);
      throw error;
    }
  }

  /**
   * Validate bot configuration
   */
  private async validateBotConfiguration(bot: IBotDocument): Promise<{ valid: boolean; error?: string }> {
    const { ethers } = await import('ethers');

    try {
      // 1. Validate wallet address format
      if (!ethers.utils.isAddress(bot.wallet)) {
        return { valid: false, error: `Invalid wallet address format: ${bot.wallet}` };
      }

      // 2. Validate copy-trading wallet address format
      if (!ethers.utils.isAddress(bot.copyTradingWallet)) {
        return { valid: false, error: `Invalid copy-trading wallet address format: ${bot.copyTradingWallet}` };
      }

      // 3. Validate contract address format
      if (!ethers.utils.isAddress(bot.copyTradingWalletContractAddress)) {
        return { valid: false, error: `Invalid contract address format: ${bot.copyTradingWalletContractAddress}` };
      }

      // 4. Decrypt and validate private key
      let privateKey: string;
      try {
        privateKey = await decrypt(bot.privateKey);
      } catch (error: any) {
        return { valid: false, error: `Failed to decrypt private key: ${error.message}` };
      }

      // 5. Validate private key format (should be 64 hex characters with 0x prefix, or 66 total)
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      if (privateKey.length !== 66 || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
        return { valid: false, error: 'Invalid private key format' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * Set bot status to ERROR in database and save error message
   */
  private async setBotErrorStatus(botId: string, errorMessage: string): Promise<void> {
    try {
      await Bot.findByIdAndUpdate(botId, { 
        status: 'ERROR',
        errorMessage: errorMessage
      }).exec();
      logger.error(`❌ Bot ${botId} status set to ERROR: ${errorMessage}`);
    } catch (error) {
      logger.error(`❌ Failed to update bot ${botId} status to ERROR:`, error);
    }
  }

  /**
   * Add a bot to global state and check USDC allowance
   */
  private async addBotToState(bot: IBotDocument): Promise<void> {
    const botId = bot._id.toString();
    
    logger.info(`🚀 Adding bot to state: ${bot.name} (${botId})`);
    
    try {
      // Validate bot configuration first
      const validation = await this.validateBotConfiguration(bot);
      if (!validation.valid) {
        await this.setBotErrorStatus(botId, validation.error || 'Validation failed');
        throw new Error(validation.error || 'Bot configuration validation failed');
      }

      // Decrypt private key (already validated)
      const privateKey = await decrypt(bot.privateKey);
      
      // Check and approve USDC allowance for all CLOB contracts
      logger.info(`🔍 Checking USDC allowance for bot ${botId} (${bot.wallet})...`);
      try {
        await this.ensureUSDCAllowance(privateKey, bot.wallet);
      } catch (error: any) {
        // If USDC allowance check fails, set bot to ERROR but don't fail completely
        logger.error(`❌ USDC allowance check failed for bot ${botId}:`, error);
        await this.setBotErrorStatus(botId, `USDC allowance check failed: ${error.message}`);
        throw error;
      }

      // Add bot to global state
      await botStateManager.addBot(bot);

      // Clear error message if bot was successfully added
      await Bot.findByIdAndUpdate(botId, { 
        errorMessage: null 
      }).exec();

      logger.info(`✅ Successfully added bot to state: ${bot.name} (${botId})`);
      this.emit('botAdded', { botId, bot });
    } catch (error: any) {
      logger.error(`❌ Failed to add bot ${botId} to state:`, error);
      
      // Ensure bot status is set to ERROR if not already set
      const currentBot = await Bot.findById(botId).exec();
      if (currentBot && currentBot.status !== 'ERROR') {
        await this.setBotErrorStatus(botId, error.message || 'Failed to add bot to state');
      }
      
      throw error;
    }
  }

  /**
   * Remove a bot from global state
   */
  private removeBotFromState(botId: string): void {
    logger.info(`🗑️  Removing bot from state: ${botId}`);
    botStateManager.removeBot(botId);
    this.emit('botRemoved', { botId });
  }

  /**
   * Ensure USDC allowance is approved for all CLOB contracts
   */
  private async ensureUSDCAllowance(privateKey: string, walletAddress: string): Promise<void> {
    logger.info(`🔍 Checking USDC allowance for wallet ${walletAddress}...`);
    
    for (const contractAddress of CLOB_CONTRACT_ADDRESSES) {
      try {
        const allowance = await checkUSDCAllowance(walletAddress, contractAddress);
        
        if (allowance === 0) {
          logger.info(`   ⚠️  No allowance for contract ${contractAddress}, approving...`);
          try {
            const txHash = await approveUSDC(privateKey, contractAddress, 'max');
            logger.info(`   ✅ Approved USDC for contract ${contractAddress}, tx: ${txHash}`);
          } catch (error) {
            logger.error(`   ❌ Failed to approve USDC for contract ${contractAddress}:`, error);
            throw error;
          }
        } else {
          logger.info(`   ✅ Allowance OK for contract ${contractAddress}: ${allowance} USDC`);
        }
      } catch (error) {
        logger.error(`   ❌ Error checking allowance for contract ${contractAddress}:`, error);
        throw error;
      }
    }
  }

  /**
   * Handle bot created event (called from botService)
   */
  async handleBotCreated(bot: IBotDocument): Promise<void> {
    if (!this.isInitialized) {
      // BotManager not initialized yet, will be loaded on startup
      return;
    }

    try {
      if (bot.status === 'RUNNING') {
        logger.info(`🆕 Bot created with RUNNING status: ${bot._id}, adding to state...`);
        await this.addBotToState(bot);
      } else {
        logger.info(`ℹ️  Bot created with status ${bot.status}: ${bot._id}, not adding to state`);
      }
    } catch (error) {
      logger.error(`❌ Failed to handle bot creation for ${bot._id}:`, error);
    }
  }

  /**
   * Handle bot updated event (called from botService)
   */
  async handleBotUpdated(bot: IBotDocument): Promise<void> {
    if (!this.isInitialized) {
      // BotManager not initialized yet, will be loaded on startup
      return;
    }

    try {
      const botId = bot._id.toString();
      const existingConfig = botStateManager.getBotConfig(botId);

      if (bot.status === 'RUNNING') {
        if (existingConfig) {
          // Bot exists in state, check if configuration changed
          const settingsChanged = JSON.stringify(existingConfig.settings) !== JSON.stringify(bot.settings);
          const contractChanged = existingConfig.copyTradingWalletContractAddress !== bot.copyTradingWalletContractAddress.toLowerCase();
          const targetWalletChanged = existingConfig.copyTradingWallet !== bot.copyTradingWallet.toLowerCase();
          const walletChanged = existingConfig.wallet !== bot.wallet.toLowerCase();
          
          if (settingsChanged || contractChanged || targetWalletChanged || walletChanged) {
            logger.info(`🔄 Bot ${botId} configuration changed, updating state...`);
            if (settingsChanged) logger.info(`   - Settings changed`);
            if (contractChanged) logger.info(`   - Contract address changed`);
            if (targetWalletChanged) logger.info(`   - Target wallet changed`);
            if (walletChanged) logger.info(`   - Bot wallet changed`);
            
            // Remove and re-add to update state (with validation)
            this.removeBotFromState(botId);
            try {
              await this.addBotToState(bot);
            } catch (error) {
              // Validation failed, bot status already set to ERROR in addBotToState
              logger.error(`❌ Failed to update bot ${botId} configuration:`, error);
            }
          } else {
            logger.info(`ℹ️  Bot ${botId} updated but no configuration changes detected`);
          }
        } else {
          // Bot not in state but now RUNNING, add it
          logger.info(`🆕 Bot ${botId} status changed to RUNNING, adding to state...`);
          try {
            await this.addBotToState(bot);
            // Error message will be cleared in addBotToState if successful
          } catch (error) {
            // Validation failed, bot status already set to ERROR in addBotToState
            logger.error(`❌ Failed to add bot ${botId} to state after status change:`, error);
          }
        }
      } else {
        // Bot status is not RUNNING, remove from state if it exists
        if (existingConfig) {
          logger.info(`🛑 Bot ${botId} status changed to ${bot.status}, removing from state...`);
          this.removeBotFromState(botId);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to handle bot update for ${bot._id}:`, error);
    }
  }

  /**
   * Handle bot deleted event (called from botService)
   */
  handleBotDeleted(botId: string): void {
    if (!this.isInitialized) {
      // BotManager not initialized yet, nothing to remove
      return;
    }

    try {
      const existingConfig = botStateManager.getBotConfig(botId);
      if (existingConfig) {
        logger.info(`🗑️  Bot ${botId} deleted, removing from state...`);
        this.removeBotFromState(botId);
      }
    } catch (error) {
      logger.error(`❌ Failed to handle bot deletion for ${botId}:`, error);
    }
  }

  /**
   * Start a specific bot by ID (public method for API)
   */
  async startBotById(botId: string): Promise<void> {
    try {
      const bot = await Bot.findById(botId).exec();
      
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      if (bot.status !== 'RUNNING') {
        throw new Error(`Bot ${botId} is not in RUNNING status (current: ${bot.status})`);
      }
      
      await this.addBotToState(bot);
    } catch (error) {
      logger.error(`Failed to start bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a specific bot by ID (public method for API)
   */
  async stopBotById(botId: string): Promise<void> {
    this.removeBotFromState(botId);
  }

  /**
   * Get status of all monitored bots
   */
  getStatus(): { total: number; bots: Array<{ botId: string; name: string }> } {
    const botConfigs = botStateManager.getAllBotConfigs();
    const bots = botConfigs.map(config => ({
      botId: config.botId,
      name: config.bot.name,
    }));

    return {
      total: bots.length,
      bots,
    };
  }

  /**
   * Shutdown the bot manager
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Bot Manager...');

    // Stop trade monitor
    await tradeMonitor.stop();

    // Clear all bot configs
    botStateManager.clear();

    this.isInitialized = false;
    logger.info('✅ Bot Manager shut down');
  }
}

export default new BotManager();

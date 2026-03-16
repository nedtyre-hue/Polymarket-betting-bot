import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import { WSS_URL } from '@/config/constants';
import { buyAbi } from '@/utils/abis/buy-abi';
import { sellAbi } from '@/utils/abis/sell-api'
import { relayAbi } from '@/utils/abis/relay-abi';
import { execAbi } from '@/utils/abis/exec-abi';
import logger from '../utils/logger';
import botStateManager from './botStateManager';
import path from 'path';
import { promises as fs } from 'fs';

const LOG_DIR = path.join(process.cwd(), 'data');
const TX_LOG_FILE = path.join(LOG_DIR, 'transactions.jsonl');
const BLOCK_LOG_FILE = path.join(LOG_DIR, 'blocks.jsonl');

async function appendTxToFile(tx: any): Promise<void> {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        const line = JSON.stringify({ ...tx, savedAt: new Date().toISOString() }) + '\n';
        await fs.appendFile(TX_LOG_FILE, line);
    } catch (err) {
        logger.error('Failed to save tx data to file:', err);
    }
}

async function appendBlockToFile(block: any): Promise<void> {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        const line = JSON.stringify({ ...block, savedAt: new Date().toISOString() }) + '\n';
        await fs.appendFile(BLOCK_LOG_FILE, line);
    } catch (err) {
        logger.error('Failed to save block data to file:', err);
    }
}

function receiptHasTargetWallet(
    receipt: ethers.providers.TransactionReceipt,
    currentTargetWallets: string[]
  ): string | null {
    if (!receipt?.logs?.length) return null;
  
    const normalizedTargets = new Set(
      currentTargetWallets.map((a) => a.toLowerCase())
    );
  
    for (const log of receipt.logs) {
      // 1) log.address itself
      if (normalizedTargets.has(log.address.toLowerCase())) {
        return log.address.toLowerCase();
      }
  
      // 2) indexed address fields in topics
      for (const topic of log.topics) {
        if (!topic || topic.length !== 66) continue;
  
        // topic is 32 bytes; address is last 20 bytes
        const topicAddress = `0x${topic.slice(26)}`.toLowerCase();
        if (normalizedTargets.has(topicAddress)) {
          return topicAddress;
        }
      }
  
      // 3) non-indexed address fields inside data
      // scan each 32-byte slot and extract last 20 bytes as potential address
      const data = (log.data || "0x").toLowerCase();
      if (data.startsWith("0x") && data.length >= 66) {
        const hex = data.slice(2);
        for (let i = 0; i + 64 <= hex.length; i += 64) {
          const word = hex.slice(i, i + 64);
          const candidate = `0x${word.slice(24)}`.toLowerCase();
          if (normalizedTargets.has(candidate)) {
            return candidate;
          }
        }
      }
    }
  
    return null;
}

/**
 * Single TradeMonitor instance that monitors all contracts
 * Uses global state from botStateManager for filtering
 */
class TradeMonitor extends EventEmitter {
    private wssProvider: ethers.providers.WebSocketProvider | null = null;
    private isRunning = false;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 10;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    /**
     * Start monitoring (single instance for all bots)
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('TradeMonitor is already running');
            return;
        }

        this.isRunning = true;
        this.reconnectAttempts = 0;

        try {
            await this.connect();
        } catch (error) {
            logger.error('Failed to start TradeMonitor:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Connect to WebSocket and start monitoring
     */
    private async connect(): Promise<void> {
        try {
            logger.info('🔍 Starting TradeMonitor (single instance for all bots)...');
            
            const wssProvider = new ethers.providers.WebSocketProvider(WSS_URL);
            this.wssProvider = wssProvider;
            const buyIface = new ethers.utils.Interface(buyAbi);
            const sellIface = new ethers.utils.Interface(sellAbi);
            const relayIface = new ethers.utils.Interface(relayAbi);
            const execIface = new ethers.utils.Interface(execAbi);

            // Get current contract addresses and target wallets from global state
            const contractAddresses = botStateManager.getContractAddresses();
            const targetWallets = botStateManager.getTargetWallets();

            logger.info(`📊 Monitoring ${contractAddresses.length} contract(s) and ${targetWallets.length} target wallet(s)`);

            // Listen for new blocks
            wssProvider.on('block', async (blockNumber: number) => {
                try {
                    // Refresh state on each block to get latest bot configs
                    let currentContractAddresses = botStateManager.getContractAddresses();
                    const currentTargetWallets = botStateManager.getTargetWallets();

                    // currentContractAddresses.push("0xe3f18acc55091e2c48d883fc8c8413319d4ab7b0".toLowerCase());
                    // currentContractAddresses.push("0xd1ebe815f921b3ebbd8d9e0a4192c6ab18360f5c".toLowerCase());
                    // currentContractAddresses.push("0xd216153c06e857cd7f72665e0af1d7d82172f494");

                    // Skip if no bots are running
                    if (currentContractAddresses.length === 0 || currentTargetWallets.length === 0) {
                        return;
                    }

                    const block = await wssProvider.getBlockWithTransactions(blockNumber);
                    
                    // Process each transaction in the block
                    for (const tx of block.transactions) {
                        const to = tx.to && tx.to.toLowerCase();   

                        // Filter: Only process transactions sent to monitored contracts
                        if (!to || !currentContractAddresses.includes(to)) {
                            continue;
                        }

                        // Filter: Skip transactions with empty or invalid data
                        if (!tx.data || tx.data === '0x' || tx.data.length < 10) {
                            continue;
                        }

                        let takerOrderData;
                        try {
                            if (to === "0xe3f18acc55091e2c48d883fc8c8413319d4ab7b0"){
                                const orderData = buyIface.parseTransaction({ data: tx.data });

                                const args = [orderData.args[0]];
                                orderData.args[1].map((arg: any) => {
                                    args.push(arg);
                                })

                                const found_arg = args.find((arg: any) => {
                                    return currentTargetWallets.includes(arg[1].toLowerCase());
                                });
                                if (!found_arg) continue;

                                // Extract takerOrder
                                takerOrderData = {
                                    salt: BigNumber.from(found_arg[0].hex || found_arg[0]._hex),
                                    maker: found_arg[1],
                                    signer: found_arg[2],
                                    taker: found_arg[3],
                                    tokenId: BigNumber.from(found_arg[4].hex || found_arg[4]._hex),
                                    makerAmount: BigNumber.from(found_arg[5].hex || found_arg[5]._hex),
                                    takerAmount: BigNumber.from(found_arg[6].hex || found_arg[6]._hex),
                                    expiration: BigNumber.from(found_arg[7].hex || found_arg[7]._hex),
                                    nonce: BigNumber.from(found_arg[8].hex || found_arg[8]._hex),
                                    feeRateBps: BigNumber.from(found_arg[9].hex || found_arg[9]._hex),
                                    side: found_arg[10],
                                    signatureType: found_arg[11],
                                    signature: found_arg[12],
                                };
                            } else if (to === "0xd1ebe815f921b3ebbd8d9e0a4192c6ab18360f5c") {
                                // const orderData = execIface.parseTransaction({ data: tx.data });

                                // await appendTxToFile(orderData);

                                continue;
                            } else if (to === "0xd216153c06e857cd7f72665e0af1d7d82172f494") {
                                // const receipt = await wssProvider.getTransactionReceipt(tx.hash);

                                // const matchedWallet = receiptHasTargetWallet(receipt, currentTargetWallets);
                                // if (!matchedWallet) continue;

                                // // const orderData = sellIface.parseTransaction({ data: tx.data });

                                // const orderData = sellIface.parseTransaction({
                                //     data: tx.data,
                                //     value: tx.value,
                                //   });               

                                // const userWallet = orderData.args.from;
                                // const recipient = orderData.args.recipient;
                                // const innerData = orderData.args.encodedFunction;
                                
                                // const relayData = relayIface.parseTransaction({ data: innerData });

                                // await appendBlockToFile(relayData);

                                continue;

                            } else continue;
                        } catch (decodeError) {
                            // Silently skip if decoding fails
                            continue;
                        }
    
                        // Verify transaction was successful
                        const receipt = await wssProvider.getTransactionReceipt(tx.hash);
                        if (receipt && receipt.status !== 1) {
                            continue;
                        }

                        // Emit transaction event with maker address for routing
                        this.emit('transaction', {
                            blockNumber,
                            transactionHash: tx.hash,
                            tokenId: takerOrderData.tokenId.toString(),
                            side: takerOrderData.side,
                            makerAmount: takerOrderData.makerAmount.toString(),
                            takerAmount: takerOrderData.takerAmount.toString(),
                            makerAddress: takerOrderData.maker.toLowerCase(), // Include maker address for routing
                        });
                    }
                } catch (error) {
                    logger.error(`Error processing block ${blockNumber}:`, error);
                }
            });

            // Handle WebSocket errors
            wssProvider._websocket.on('error', (error: any) => {
                logger.error('WebSocket error:', error);
                this.handleReconnect();
            });

            // Handle WebSocket close events
            wssProvider._websocket.on('close', (code: number, reason: string) => {
                logger.warn(`WebSocket closed: Code ${code}, Reason: ${reason}`);
                this.isRunning = false;
                this.handleReconnect();
            });

            logger.info('✅ TradeMonitor connected and monitoring');
        } catch (error) {
            logger.error('Error connecting TradeMonitor:', error);
            this.handleReconnect();
            throw error;
        }
    }

    /**
     * Handle reconnection with exponential backoff
     */
    private handleReconnect(): void {
        if (!this.isRunning && this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            logger.error('Max reconnection attempts reached. TradeMonitor stopped.');
            this.emit('maxReconnectReached');
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectAttempts++;
        const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 60000); // Max 60 seconds

        logger.info(`🔄 Reconnecting TradeMonitor in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.connect();
                this.reconnectAttempts = 0; // Reset on successful connection
            } catch (error) {
                logger.error('Reconnection failed:', error);
                this.handleReconnect();
            }
        }, delay);
    }

    /**
     * Stop monitoring
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        logger.info('🛑 Stopping TradeMonitor...');
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        try {
            if (this.wssProvider) {
                this.wssProvider.removeAllListeners();
                if (this.wssProvider._websocket) {
                    this.wssProvider._websocket.removeAllListeners();
                    this.wssProvider._websocket.close();
                }
                await this.wssProvider.destroy();
                this.wssProvider = null;
            }
            this.isRunning = false;
            this.reconnectAttempts = 0;
            logger.info('✅ TradeMonitor stopped');
        } catch (error) {
            logger.error('Error stopping TradeMonitor:', error);
            this.isRunning = false;
        }
    }

    getIsRunning(): boolean {
        return this.isRunning;
    }
}

export default new TradeMonitor();

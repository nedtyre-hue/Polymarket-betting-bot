import { BigNumber, ethers } from 'ethers';
import { EventEmitter } from 'events';
import { WSS_URL } from '@/config/constants';
import { abi } from '@/utils/abis/abi';
import logger from '../utils/logger';
import botStateManager from './botStateManager';

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
            const iface = new ethers.utils.Interface(abi);

            // Get current contract addresses and target wallets from global state
            const contractAddresses = botStateManager.getContractAddresses();
            const targetWallets = botStateManager.getTargetWallets();

            logger.info(`📊 Monitoring ${contractAddresses.length} contract(s) and ${targetWallets.length} target wallet(s)`);

            // Listen for new blocks
            wssProvider.on('block', async (blockNumber: string) => {
                try {
                    // Refresh state on each block to get latest bot configs
                    const currentContractAddresses = botStateManager.getContractAddresses();
                    const currentTargetWallets = botStateManager.getTargetWallets();

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

                        let orderData;
                        try {
                            orderData = iface.parseTransaction({ data: tx.data });
                        } catch (decodeError) {
                            // Silently skip if decoding fails
                            continue;
                        }

                        // Extract takerOrder
                        const takerOrder = orderData.args[0];
                        const takerOrderData = {
                            salt: BigNumber.from(takerOrder[0].hex || takerOrder[0]._hex),
                            maker: takerOrder[1],
                            signer: takerOrder[2],
                            taker: takerOrder[3],
                            tokenId: BigNumber.from(takerOrder[4].hex || takerOrder[4]._hex),
                            makerAmount: BigNumber.from(takerOrder[5].hex || takerOrder[5]._hex),
                            takerAmount: BigNumber.from(takerOrder[6].hex || takerOrder[6]._hex),
                            expiration: BigNumber.from(takerOrder[7].hex || takerOrder[7]._hex),
                            nonce: BigNumber.from(takerOrder[8].hex || takerOrder[8]._hex),
                            feeRateBps: BigNumber.from(takerOrder[9].hex || takerOrder[9]._hex),
                            side: takerOrder[10],
                            signatureType: takerOrder[11],
                            signature: takerOrder[12],
                        };

                        // Filter: Check if maker matches any target wallet
                        const makerAddress = takerOrderData.maker.toLowerCase();
                        if (!currentTargetWallets.includes(makerAddress)) {
                            continue;
                        }

                        // Extract makerOrders (not used but kept for completeness)
                        const makerOrders = orderData.args[1];
                        const makerOrdersData = makerOrders.map((order: any[]) => ({
                            salt: BigNumber.from(order[0].hex || order[0]._hex),
                            maker: order[1],
                            signer: order[2],
                            taker: order[3],
                            tokenId: BigNumber.from(order[4]?.hex || order[4]._hex),
                            makerAmount: BigNumber.from(order[5].hex || order[5]._hex),
                            takerAmount: BigNumber.from(order[6].hex || order[6]._hex),
                            expiration: order[7].hex || order[7]._hex,
                            nonce: BigNumber.from(order[8].hex || order[8]._hex),
                            feeRateBps: BigNumber.from(order[9].hex || order[9]._hex),
                            side: order[10],
                            signatureType: order[11],
                            signature: order[12],
                        }));

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
                            makerAddress, // Include maker address for routing
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

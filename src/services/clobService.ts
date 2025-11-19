import { ethers } from 'ethers';
import { ApiKeyCreds, ApiKeysResponse, ClobClient, OpenOrder, OpenOrdersResponse, OrderScoring, OrderType } from '@polymarket/clob-client';
import { ICanceledOrders, IPlacedOrderResponse } from '@/types';
import { RPC_URL } from '@/config/constants';
import { SignatureType } from '@polymarket/order-utils';

class ClobService {
    private clobClient: ClobClient | null = null;
    private clobRpcUrl: string;
    private privateKey: string;

    constructor(clobRpcUrl: string, privateKey: string) {
        this.clobRpcUrl = clobRpcUrl;
        this.privateKey = privateKey;
    }

    private async getClobClient(): Promise<ClobClient> {
        if (this.clobClient) {
            return this.clobClient;
        }

        // Create a provider from the RPC URL
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        // Create wallet and connect it to the provider
        const wallet = new ethers.Wallet(this.privateKey, provider);
        const chainId = await wallet.getChainId();
        
        // Get wallet address from the private key
        const walletAddress = ethers.utils.getAddress(wallet.address);
        
        //In general don't create a new API key, always derive or createOrDerive
        const interim = new ClobClient(this.clobRpcUrl, chainId, wallet);
        const creds: ApiKeyCreds = await interim.createOrDeriveApiKey();
        if (!creds) {
            throw new Error("Failed to get API creds");
        }
        
        // Create ClobClient with credentials
        this.clobClient = new ClobClient(
            this.clobRpcUrl,
            chainId,
            wallet,
            creds,
            SignatureType.EOA,
            walletAddress
        );

        return this.clobClient;
    }

    async createApiKey(): Promise<ApiKeyCreds> {
        const clobClient = await this.getClobClient();
        const creds = await clobClient.createApiKey();
        return creds;
    }

    async getApiKey(): Promise<ApiKeysResponse> {
        const clobClient = await this.getClobClient();
        const creds = await clobClient.getApiKeys();
        return creds;
    }

    async deleteApiKey(): Promise<string> {
        const clobClient = await this.getClobClient();
        const resp = await clobClient.deleteApiKey();
        return resp;
    }

    async placeOrder(
        tokenID: string,
        price: number,
        side: string,
        size: number,
        feeRateBps: number,
        nonce: number
    ): Promise<IPlacedOrderResponse> {
        try {
            const clobClient = await this.getClobClient();
            const order = await clobClient.createOrder({
                tokenID,
                price,
                side: side as any,
                size,
                feeRateBps,
                nonce
            });
            const resp = await clobClient.postOrder(order, OrderType.GTC);
            return resp;
        } catch (error) {
            throw error;
        }
    }

    async getOrder(orderID: string): Promise<OpenOrder> {
        try {
            const clobClient = await this.getClobClient();
            const order = await clobClient.getOrder(orderID);
            return order;
        } catch (error: any) {
            throw error;
        }
    }

    async isOrderScoring(orderID: string): Promise<OrderScoring> {
        try {
            const clobClient = await this.getClobClient();
            const scoring = await clobClient.isOrderScoring({ order_id: orderID });
            return scoring;
        } catch (error: any) {
            throw error;
        }
    }

    async getActiveOrders(market: string): Promise<OpenOrdersResponse> {
        try {
            const clobClient = await this.getClobClient();
            const orders = await clobClient.getOpenOrders({ market });
            return orders;
        } catch (error: any) {
            throw error;
        }
    }

    async cancelOrder(orderID: string): Promise<string> {
        try {
            const clobClient = await this.getClobClient();
            const resp = await clobClient.cancelOrder({ orderID });
            return resp;
        } catch (error: any) {
            throw error;
        }
    }

    async cancelAllOrders(): Promise<ICanceledOrders> {
        try {
            const clobClient = await this.getClobClient();
            const resp = await clobClient.cancelAll();
            return resp;
        } catch (error: any) {
            throw error;
        }
    }
}

export default ClobService;


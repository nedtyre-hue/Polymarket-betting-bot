// npm i @polymarket/clob-client @polymarket/order-utils ethers
import { ethers } from "ethers";
import {
  ApiKeyCreds,
  ClobClient,
  OpenOrder,
  OpenOrdersResponse,
  OrderScoring,
  OrderType,
} from "@polymarket/clob-client";
import { IPlacedOrderResponse } from "@/types/index";
import { SignatureType } from "@polymarket/order-utils";

class ClobService {
  private clobClient: ClobClient | null = null;
  private clobRpcUrl: string;
  private privateKey: string;      // MetaMask private key (EOA)
  private proxyWalletAddress: string; // Polymarket proxy wallet (funder)
  private chainId = 137; // Polygon

  constructor(clobRpcUrl: string, privateKey: string, proxyWalletAddress: string) {
    this.clobRpcUrl = clobRpcUrl;
    this.privateKey = privateKey;
    this.proxyWalletAddress = proxyWalletAddress;
  }

  private async getClobClient(): Promise<ClobClient> {
    if (this.clobClient) return this.clobClient;

    // NOTE: use your RPC URL (Polygon RPC)
    const provider = new ethers.providers.JsonRpcProvider(this.clobRpcUrl);
    const signer = new ethers.Wallet(this.privateKey, provider);

    // Derive/create API key pair (the client helper will sign this request with signer)
    const interim = new ClobClient(this.clobRpcUrl, this.chainId, signer);
    const creds: ApiKeyCreds = await interim.createOrDeriveApiKey();
    if (!creds) throw new Error("Failed to create/derive API creds");

    // Create the real client:
    // - signer: your EOA (MetaMask private key)
    // - signatureType: POLY_PROXY so the client will sign proxy-style orders
    // - funder: your POLY proxy wallet address (where USDC must be)
    this.clobClient = new ClobClient(
      this.clobRpcUrl,
      this.chainId,
      signer,
      creds,
      SignatureType.POLY_PROXY,
      this.proxyWalletAddress
    );

    return this.clobClient;
  }

  async placeOrder(
    tokenID: string,
    price: number,
    side: "BUY" | "SELL",
    size: number,
    feeRateBps = 0,
    nonce = 0
  ): Promise<IPlacedOrderResponse> {
    const clobClient = await this.getClobClient();

    // createOrder returns the proper Order object (client handles EIP712/hash/signing strategy)
    const order = await clobClient.createOrder({
      tokenID,
      price,
      side: side as any,
      size,
      feeRateBps,
      nonce
    });

    // post the order; the client will attach the correct L2 headers and signature
    const resp = await clobClient.postOrder(order, OrderType.GTC);
    return resp as IPlacedOrderResponse;
  }

  async getOrder(orderID: string): Promise<OpenOrder> {
    const clobClient = await this.getClobClient();
    return await clobClient.getOrder(orderID);
  }

  async isOrderScoring(orderID: string): Promise<OrderScoring> {
    const clobClient = await this.getClobClient();
    return await clobClient.isOrderScoring({ order_id: orderID });
  }

  async getActiveOrders(market: string): Promise<OpenOrdersResponse> {
    const clobClient = await this.getClobClient();
    return await clobClient.getOpenOrders({ market });
  }

  async cancelOrder(orderID: string): Promise<string> {
    const clobClient = await this.getClobClient();
    return await clobClient.cancelOrder({ orderID });
  }

  async cancelAllOrders() {
    const clobClient = await this.getClobClient();
    return await clobClient.cancelAll();
  }
}

export default ClobService;

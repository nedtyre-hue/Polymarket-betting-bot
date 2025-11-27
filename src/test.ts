import WebSocket from "ws";
import axios from "axios";

const MARKET_CHANNEL = "market";
const USER_CHANNEL = "user";

class PolymarketWebSocket {
  channelType: string;
  url: string;
  ids: string[];
  auth: string | null;
  verbose: boolean;
  ws: WebSocket;

  constructor(channelType: string, url: string, ids: string[], auth = null, verbose = true) {
    this.channelType = channelType;
    this.url = `${url}/ws/${channelType}`;
    this.ids = ids;       // asset_ids for market, condition_ids for user
    this.auth = auth;     // API key auth for user channel
    this.verbose = verbose;

    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => this.onOpen());
    this.ws.on("message", (msg: any) => this.onMessage(msg.toString()));
    this.ws.on("error", (err) => console.error("WebSocket Error:", err));
    this.ws.on("close", () => console.log("WebSocket Closed"));
  }

  // Open → subscribe
  onOpen() {
    console.log(`Connected → ${this.channelType}`);

    let subMsg;

    if (this.channelType === MARKET_CHANNEL) {
      // Correct subscription payload
      subMsg = {
        type: "subscribe",
        assets_ids: this.ids,
      };

    } else if (this.channelType === USER_CHANNEL) {
      if (!this.auth) {
        console.error("❌ USER channel requires auth");
        return;
      }
      subMsg = {
        type: "subscribe",
        markets: this.ids,
        auth: this.auth
      };
    }

    this.ws.send(JSON.stringify(subMsg));
    console.log("Subscribed:", subMsg);

    this.startPing();
  }

  // Handle all incoming messages
  onMessage(raw: string) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      console.log("Non-JSON:", raw);
      return;
    }

    const eventType = msg.event_type;
    console.log("\n=== EVENT:", eventType, "===");
    console.log(JSON.stringify(msg, null, 2));
  }

  // Keep the connection alive
  startPing() {
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("PING");
      }
    }, 10_000);
  }

  run() {
    // Automatically handled by constructor
  }
}

const URL = "wss://ws-subscriptions-clob.polymarket.com";

const MARKET_IDS = {
    btc: "btc-updown-15m",
    eth: "eth-updown-15m",
    sol: "sol-updown-15m",
    xrp: "xrp-updown-15m"
};

function getCurrent15mUTC() {
    const now = Math.floor(Date.now() / 1000); // current UTC timestamp (sec)
  
    const FIFTEEN_MIN = 15 * 60;
  
    // round DOWN to nearest 15-minute block
    const block = Math.floor(now / FIFTEEN_MIN) * FIFTEEN_MIN;
  
    return block;
}

async function getClobTokenIds(slug: string) {
    const url = `https://gamma-api.polymarket.com/markets/slug/${slug}`;
  
    try {
      const res: any = await axios.get(url);
  
      return JSON.parse(res.data.clobTokenIds);
    } catch (err: any) {
      console.error("Error fetching market:", err.response?.data || err.message);
    }
}

async function main() {
    const slug = MARKET_IDS.btc + "-" + getCurrent15mUTC();
    const clobTokenIds = await getClobTokenIds(slug);

    console.log("slug:", slug);
    console.log("clobTokenIds:", clobTokenIds);

    // Market (public)
    new PolymarketWebSocket(
        "market",
        URL,
        clobTokenIds,
        null,   // no auth needed
        true
    );
}

main();
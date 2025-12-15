# Polymarket Betting Bot 🤖

A comprehensive TypeScript/Node.js backend system for automated trading on Polymarket. This platform supports two types of trading bots: **Copy Trading Bots** and **Strategy Bots** with odds-based strategies.

## ✨ Features

### 🎯 Copy Trading Bots
- **Automated Copy Trading**: Automatically replicate trades from any Polymarket wallet
- **Configurable Settings**: 
  - Bet size strategies (Percentage or Fixed)
  - Min/Max bet size limits
  - Copy ratio (0-100%)
  - Retry logic with customizable limits
  - Timeout and increment settings
  - Max buy/sell size constraints
- **Real-time Monitoring**: Track all bot activities and order history
- **Multi-bot Support**: Run multiple copy trading bots simultaneously

### 📊 Strategy Bots (Odds-Based Trading)
- **Market Selection**: Trade on BTC, ETH, SOL, or XRP markets
- **Trigger-based Trading**: Execute trades when odds reach specified thresholds
- **Trade Types**: Support for both Market and Limit orders
- **Centralized Market Monitoring**: Efficient monitoring of multiple markets
- **Configurable Strategy Settings**: Customize trigger prices, timeouts, and trade sizes

### 🔐 Security
- **Encrypted Private Keys**: All wallet private keys are encrypted before storage
- **JWT Authentication**: Secure API authentication
- **User Management**: Multi-user support with role-based access

### 📈 Additional Features
- **Order History Tracking**: Complete audit trail of all trades
- **Real-time WebSocket Support**: Live updates via WebSocket connections
- **Error Handling**: Comprehensive error logging and bot state management
- **Graceful Shutdown**: Proper cleanup on server shutdown
- **RESTful API**: Well-structured REST endpoints for all operations

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Cryptography**: bcrypt for password hashing, custom encryption for private keys
- **Blockchain Integration**: 
  - `@polymarket/clob-client` for Polymarket CLOB API
  - `ethers.js` for blockchain interactions
- **WebSocket**: `ws` for real-time connections
- **Logging**: Winston for structured logging
- **Validation**: Joi for request validation

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB (local or cloud instance)
- npm or yarn package manager
- A Polygon RPC endpoint (e.g., Alchemy, Infura, or QuickNode)
- Polymarket API credentials (CLOB HTTP and WebSocket endpoints)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/echandsome/Polymarket-betting-bot
   cd Polymarket-betting-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   NODE_ENV=development
   SERVER_PORT=8000
   JWT_SECRET=your-secret-key-change-in-production
   ENCRYPTION_KEY=your-32-byte-encryption-key

   # Database Configuration
   MONGODB_URI=mongodb://127.0.0.1:27017/contractor
   MONGODB_DB_NAME=contractor
   MONGODB_MAX_POOL_SIZE=20

   # CORS Configuration
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

   # Polymarket API Endpoints
   CLOB_HTTP_URL=https://clob.polymarket.com
   CLOB_WS_URL=wss://clob.polymarket.com

   # Blockchain Configuration (Polygon Network)
   RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   WSS_URL=wss://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   
   # Token Contract Address
   USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 🎮 Usage

### Development Mode
Run the server in development mode with hot reload:
```bash
npm run dev
```

### Production Mode
Build and start the production server:
```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
Polymarket-betting-bot/
├── src/
│   ├── config/           # Configuration files (constants, database, enums)
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Express middlewares (auth, validation)
│   ├── models/           # MongoDB/Mongoose models
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic and external integrations
│   │   └── odds-strategy/# Strategy bot services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions and helpers
│   │   └── abis/         # Smart contract ABIs
│   ├── validators/       # Joi validation schemas
│   ├── logs/             # Log files (generated at runtime)
│   ├── public/           # Static frontend files
│   └── index.ts          # Application entry point
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Bot Settings (Copy Trading)

- **ratio**: Copy ratio (0-1, e.g., 0.5 = 50% of original trade size)
- **retryLimit**: Maximum number of retry attempts (1-100)
- **timeout**: Timeout in seconds (1-3600)
- **increment**: Increment value for retries
- **minBetSize**: Minimum bet size in USDC (minimum: 5)
- **maxBetSize**: Maximum bet size in USDC
- **maxBuySize**: Maximum buy size per trade (optional)
- **maxSellSize**: Maximum sell size per trade (optional)
- **dumpRemainingSharesOnPartialSell**: Boolean to dump remaining shares
- **betSizeStrategy**: 'PERCENTAGE' or 'FIX'
- **fixedSize**: Fixed bet size when strategy is 'FIX'

### Strategy Bot Settings

- **marketSelection**: 'BTC', 'ETH', 'SOL', or 'XRP'
- **triggerPrice**: Odds threshold (0-100)
- **tradeType**: 'MARKET' or 'LIMIT'
- **limitPrice**: Limit price for limit orders (optional)
- **timeout**: Timeout in seconds (1-3600)
- **increment**: Increment value
- **fixedSize**: Fixed trade size in USDC
- **retryLimit**: Maximum retry attempts (1-100)

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use environment variables for sensitive data
2. **Use strong encryption keys** - Generate a secure 32-byte key for `ENCRYPTION_KEY`
3. **Change default JWT secret** - Use a strong, random secret for production
4. **Secure your MongoDB instance** - Enable authentication and use connection strings with credentials
5. **Use HTTPS in production** - Always use SSL/TLS for production deployments
6. **Implement rate limiting** - Consider adding rate limiting middleware for API endpoints
7. **Private key security** - Private keys are encrypted, but ensure your encryption key is stored securely

## 🐛 Troubleshooting

### Bot not starting
- Check that the wallet has sufficient USDC balance
- Verify the private key is correct and wallet is properly configured
- Check MongoDB connection
- Review logs in `src/logs/` directory

### Connection issues
- Verify RPC endpoint is accessible and correct
- Check CLOB API endpoints are correct
- Ensure WebSocket connections are not blocked by firewall

### Database issues
- Verify MongoDB is running
- Check connection string in `.env`
- Ensure database name exists

## 📝 Logging

The application uses Winston for logging. Logs are stored in:
- `src/logs/error.log` - Error logs
- `src/logs/info.log` - Info logs
- `src/logs/warn.log` - Warning logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC License

## ⚠️ Disclaimer

This software is for educational and research purposes. Trading cryptocurrencies and prediction markets involves substantial risk of loss. The authors and contributors are not responsible for any financial losses incurred while using this software. Always test thoroughly in a safe environment before deploying with real funds.

## 📞 Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Happy Trading! 🚀**


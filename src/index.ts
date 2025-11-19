import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from '@/utils/logger';
import { CORS_ALLOWED_ORIGINS, SERVER_PORT } from '@/config/constants';
import { connectDatabase } from '@/config/database';
import routes from '@/routes';
import botManager from '@/services/botManager';

const app = express();

app.use(cookieParser());

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (restrict to specific domains for production)
const corsOptions = {
  origin: CORS_ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// API routes
app.use('/api', routes);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Redirect all routes to frontend (SPA support)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function initializeServer() {
    try {
        // Connect to database
        await connectDatabase();
        logger.info('Database connected successfully');
        
        // Initialize bot manager (loads and starts all RUNNING bots)
        await botManager.initialize();
        
        // Start server
        app.listen(SERVER_PORT, () => {
          logger.info(`Server is running at http://localhost:${SERVER_PORT}`);
          logger.info('🤖 Bot Manager is active and monitoring RUNNING bots');
        });
    } catch (error) {
        logger.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await botManager.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await botManager.shutdown();
    process.exit(0);
});

// Start the server
initializeServer();

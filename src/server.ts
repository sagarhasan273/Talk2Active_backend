import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import 'module-alias/register';

import { config } from 'src/config';
import { closeDatabaseConnection, initializeDatabases } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import { initSocketServer } from 'src/socket';
import logger from 'src/utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { rootRouter } from './routes/root.router';
import { getLocalIp } from './utils/system';

const app = express();
const server = createServer(app);

// ==========================================
// Middleware & Routes
// ==========================================
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(databaseMiddleware);

// Main API routes
app.use('/', rootRouter);

// Error middleware MUST be mounted after routes
app.use(errorMiddleware);

// ==========================================
// Initialize Socket.io
// ==========================================
initSocketServer(server);

// ==========================================
// Boot Sequence
// ==========================================
async function startApp() {
  try {
    // 1. Ensure databases (Mongo & Redis) are ready before opening ports
    await initializeDatabases();

    // 2. Start listening
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`[Server] Running at http://${getLocalIp()}:${config.port}`);
      logger.info('[Socket.io] Server initialized and attached');
    });

    // 3. Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');

      server.close(async () => {
        logger.info('HTTP server and Socket.io closed');
        await closeDatabaseConnection();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('[App] Failed to start', { error });
    process.exit(1);
  }
}

// Catch unhandled promises to prevent silent crashes
process.on('unhandledRejection', (reason) => {
  logger.error('[Process] Unhandled Promise Rejection:', reason);
});

// Boot the application
startApp();
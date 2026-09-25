import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import logger from 'src/utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { rootRouter } from './routes/root.router';
import { getLocalIp } from './utils/system';

// Import the socket initialization logic
import { initSocketServer } from 'src/socket';

const app = express();
const server = createServer(app);

// Centralize allowed origins so Socket.io and Express CORS are perfectly synced
const allowedOrigins = [
  `http://${getLocalIp()}:8081`,
  'http://localhost:8081',
  'https://www.youtube.com',
  'https://talk2-active.vercel.app',
];

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(databaseMiddleware);

// Main API routes
app.use('/', rootRouter);

// Error middleware MUST be mounted after routes to catch errors
app.use(errorMiddleware);

// ==========================================
// Initialize Socket.io with the HTTP server
// ==========================================
initSocketServer(server, allowedOrigins);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running at http://${getLocalIp()}:${PORT}`);
  logger.info('Socket.io server initialized and attached');
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabaseConnection();

  // Closing the server will also automatically terminate active Socket.io connections
  server.close(() => {
    logger.info('HTTP server and Socket.io closed');
  });
});
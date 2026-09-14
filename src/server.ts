import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import logger from 'src/utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { rootRouter } from './routes/root.router';
import { getLocalIp } from './utils/system';

const app = express();
const server = createServer(app);

// CORS configuration
app.use(
  cors({
    origin: [
      `http://${getLocalIp()}:8081`,
      'http://localhost:8081',
      'https://www.youtube.com',
      'https://talk2-active.vercel.app',
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(databaseMiddleware);

// Main API routes
app.use('/', rootRouter);

// Error middleware MUST be mounted after routes to catch errors
app.use(errorMiddleware);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Listen on '0.0.0.0' to accept connections from localhost, LAN IPs, and emulators
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running at http://${getLocalIp()}:${PORT}`);
  logger.info(`Local fallback: http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabaseConnection();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});
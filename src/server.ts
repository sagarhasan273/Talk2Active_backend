import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import logger from 'src/utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { rootRouter } from './routes/root.router';
import setupVoiceHandlers from './socket/voice-handler';
import { getLocalIp } from './utils/system';

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: [`http://${getLocalIp()}:8081`, 'http://localhost:8081', 'https://www.youtube.com'],
    credentials: true,
  })
);

app.use(express.json());
app.use(databaseMiddleware);
app.use(errorMiddleware);

app.use('/', rootRouter);

// socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setupVoiceHandlers(io);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
server.listen(PORT, () => {
  logger.info(`Server is running at http://${getLocalIp()}:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabaseConnection();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

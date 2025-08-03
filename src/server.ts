import cors from 'cors';
import express from 'express';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import { InventoryRouter } from 'src/routes/inventory.router';
import { UserRoutes } from 'src/routes/user.routes';
import logger from 'src/utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { SettingRoutes } from './routes/settings.routes';
import { getLocalIp } from './utils/system';

const app = express();

app.use(
  cors({
    origin: ['http://192.168.68.101:8081', 'http://localhost:8081'],
    credentials: true,
  })
);

app.use(express.json());
app.use(databaseMiddleware);
app.use(errorMiddleware);

const userRouters = new UserRoutes();
app.use('/user', userRouters.router);

const settingsRouters = new SettingRoutes();
app.use('/settings', settingsRouters.router);

const inventoryRouters = new InventoryRouter();
app.use('/inventory', inventoryRouters.router);



const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
const server = app.listen(PORT, () => {
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

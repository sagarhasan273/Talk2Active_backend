import cors from 'cors';
import express from 'express';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import { InventoryRouter } from 'src/routes/inventory.router';
import { UserRoutes } from 'src/routes/user.routes';
import logger from 'src/utils/logger';

const app = express();

app.use(
  cors({
    origin: ['http://192.168.68.101:8081', 'http://localhost:8081'],
    credentials: true,
  })
);

app.use(express.json());
app.use(databaseMiddleware);

const userRouters = new UserRoutes().router;
app.use('/user', userRouters);

const inventoryRouters = new InventoryRouter().router;
app.use('/inventory', inventoryRouters);



const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabaseConnection();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

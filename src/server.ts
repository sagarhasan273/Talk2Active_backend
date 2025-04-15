import cors from 'cors';
import express from 'express';
import { closeDatabaseConnection } from 'src/database';
import { databaseMiddleware } from 'src/middlewares/database.middleware';
import { UserRoutes } from 'src/routes/user-routes';
import logger from 'src/utils/logger';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:8081',
    credentials: true, // if you're using cookies or auth headers
  })
); // Enable CORS for all routes

app.use(express.json());
app.use(databaseMiddleware); // Use the database middleware for all routes

const userRouters = new UserRoutes().router;
app.use('/user', userRouters); // Use the user router for user-related routes

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await closeDatabaseConnection(); // Close the database connection
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

import * as dotenv from 'dotenv';
import { getLocalIp } from './utils/system';

dotenv.config();

export const config = {
  // App Environment
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,

  // MongoDB Configuration
  dbUrl: process.env.DB_URL || 'mongodb://localhost:27017/talk2active',
  dbName: process.env.DB_NAME || 'talk2active',
  dbOptions: {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '30000', 10),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS || '30000', 10),
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '100', 10),
  },

  // Redis Configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // LiveKit Configuration
  livekit: {
    apiUrl: process.env.LIVEKIT_API_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  },

  // Cloudinary Configuration
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  // CORS / Sockets
  allowedOrigins: [
    `http://${getLocalIp()}:8081`,
    'http://localhost:8081',
    'https://www.youtube.com',
    'https://talk2-active.vercel.app',
    'https://unable-sloping-impeding.ngrok-free.dev'
  ]
};
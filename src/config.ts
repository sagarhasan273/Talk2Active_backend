import cloudinary from 'cloudinary';
import * as dotenv from 'dotenv';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

dotenv.config();

interface DatabaseConfig {
  url: string;
  dbName: string;
  options: {
    serverSelectionTimeoutMS: number;
    connectTimeoutMS: number;
    socketTimeoutMS: number;
    maxPoolSize: number;
  };
}

export const dbConfig: DatabaseConfig = {
  url: process.env.DB_URL || 'mongodb://localhost:27017/talk2active',
  dbName: process.env.DB_NAME || 'talk2active',
  options: {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '30000', 10),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS || '30000', 10),
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '100', 10),
  },
};

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryInstance = cloudinary.v2;

// Type for Cloudinary upload result
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

// Set up multer for memory storage
const storage = multer.memoryStorage();

// Supported image MIME types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'application/octet-stream',
];

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const fileType = file.mimetype.toLowerCase();

  // Check against our supported types
  if (SUPPORTED_IMAGE_TYPES.some((type) => fileType === type.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type. Please upload one of these image formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
      )
    );
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
});

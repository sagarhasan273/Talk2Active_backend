import cloudinary from 'cloudinary';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { config } from 'src/config';

// Configure Cloudinary using centralized config
cloudinary.v2.config(config.cloudinary);
export const cloudinaryInstance = cloudinary.v2;

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    [key: string]: any;
}

const storage = multer.memoryStorage();
const SUPPORTED_IMAGE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/heic', 'image/heif', 'image/svg+xml', 'application/octet-stream',
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const fileType = file.mimetype.toLowerCase();
    if (SUPPORTED_IMAGE_TYPES.some((type) => fileType === type)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type. Please upload one of these image formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`));
    }
};

export const uploadImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
});
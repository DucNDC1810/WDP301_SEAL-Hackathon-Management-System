import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

const isConfigured = !!(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else {
  console.warn(
    "⚠️ [Cloudinary] Cloudinary credentials are not configured in .env. Falling back to local/base64 storage."
  );
}

/**
 * Uploads a base64 image or file URL to Cloudinary.
 * If Cloudinary is not configured, it returns the base64 string as-is.
 * 
 * @param {string} fileStr - Base64 image string or file URL
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export const uploadImage = async (fileStr, folder = 'seal-hackathon') => {
  if (!isConfigured) {
    return fileStr; // Fallback to storing as base64/local URL
  }

  try {
    const result = await cloudinary.uploader.upload(fileStr, {
      folder: folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error("[Cloudinary Upload Error]", error);
    throw new Error("Không thể tải ảnh lên Cloudinary: " + error.message);
  }
};

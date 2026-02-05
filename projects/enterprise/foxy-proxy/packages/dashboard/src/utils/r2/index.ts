import {
  EnhancedBunR2Client,
  enhancedBunR2Client,
  type EnhancedBunFile,
  type FileSchema,
  type FileProcessingOptions
} from "./enhanced-bun-client";
import { R2Client } from "./base";
import type { R2Config, UploadResult, FileMetadata, R2FileInfo } from "./base";

export type { R2Config, UploadResult, FileMetadata, R2FileInfo, R2Client };
export type { EnhancedBunFile, FileSchema, FileProcessingOptions };
export { EnhancedBunR2Client, enhancedBunR2Client };

/**
 * Factory function to create the appropriate R2 client
 * Defaults to Enhanced Bun client for better functionality
 */
export const createR2Client = (config: R2Config, useEnhanced: boolean = true): R2Client => {
  return useEnhanced ? new EnhancedBunR2Client(config) : new EnhancedBunR2Client(config);
};

// Default configuration
const defaultConfig: R2Config = {
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || "",
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || "",
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "",
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || "foxy-proxy-storage",
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL
};

// Default R2 instances
export const r2Client = createR2Client(defaultConfig, true); // Use Enhanced by default
export const enhancedR2Client = new EnhancedBunR2Client(defaultConfig);

// Helper functions for common operations
export const uploadToR2 = (file: File, key?: string) => r2Client.uploadFile(file, key);
export const deleteFromR2 = (key: string) => r2Client.deleteFile(key);
export const getR2DownloadUrl = (key: string, expiresIn?: number) =>
  r2Client.getDownloadUrl(key, expiresIn);
export const getR2UploadUrl = (key: string, contentType: string, expiresIn?: number) =>
  r2Client.getUploadUrl(key, contentType, expiresIn);
export const listR2Files = (prefix?: string) => r2Client.listFiles(prefix);
export const fileExistsInR2 = (key: string) => r2Client.fileExists(key);
export const getR2FileMetadata = (key: string) => r2Client.getFileMetadata(key);

// Enhanced helper functions with schema support
export const uploadWithSchema = (file: File, key?: string, options?: FileProcessingOptions) =>
  enhancedBunR2Client.uploadFileWithSchema(file, key, options);

export const getEnhancedBunFile = (key: string) => enhancedBunR2Client.createEnhancedBunFile(key);

export const getFileSchema = (key: string) => enhancedBunR2Client.getFileSchema(key);

export const processFile = (key: string, options: FileProcessingOptions) =>
  enhancedBunR2Client.processFile(key, options);

export const getFileInfoWithSchema = (key: string) =>
  enhancedBunR2Client.getFileInfoWithSchema(key);

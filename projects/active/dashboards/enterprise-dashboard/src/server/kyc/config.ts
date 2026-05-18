/**
 * [KYC][CONFIG][MODULE][META:{export}]
 * KYC Configuration Module
 * Loads configuration from environment variables following existing config.ts patterns
 * #REF:ISSUE-KYC-007
 */

import { config } from "../config";

/**
 * Parse and validate a numeric environment variable
 */
function parseEnvInt(key: string, defaultValue: number, options?: { min?: number; max?: number }): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    console.error(`Invalid ${key}: "${raw}" - must be a number, using default ${defaultValue}`);
    return defaultValue;
  }
  if (options?.min !== undefined && parsed < options.min) {
    console.error(`Invalid ${key}: ${parsed} - must be >= ${options.min}, using default ${defaultValue}`);
    return defaultValue;
  }
  if (options?.max !== undefined && parsed > options.max) {
    console.error(`Invalid ${key}: ${parsed} - must be <= ${options.max}, using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export const kycConfig = {
  maxRetries: parseEnvInt("KYC_MAX_RETRIES", 3, { min: 1, max: 10 }),
  manualReviewThreshold: parseEnvInt("KYC_REVIEW_THRESHOLD", 70, { min: 0, max: 100 }),
  adbPath: process.env.ADB_PATH || "adb",
  androidVersion: process.env.ANDROID_VERSION || "13",
  packageName: process.env.DUOPLUS_PACKAGE || "com.duoplus.family",
  s3Bucket: process.env.KYC_S3_BUCKET || config.S3.BUCKET,
  googleCloudKey: process.env.GOOGLE_CLOUD_KEY,
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || "us-east-1",
  adminWebhookUrl: process.env.ADMIN_WEBHOOK_URL,
} as const;

export type KYCConfig = typeof kycConfig;
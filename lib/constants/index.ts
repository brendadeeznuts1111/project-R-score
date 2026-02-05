/**
 * 📚 FactoryWager Constants Index
 * 
 * Central hub for all constants used across the monorepo
 * 
 * @version 1.0.0
 */

// Re-export all constants
export * from './color-constants';

// Core constants
export const FACTORYWAGER_VERSION = '4.0';
export const MONOREPO_VERSION = '1.0.0';

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  CPU_WARNING_MS: 100,
  CPU_ERROR_MS: 500,
  MEMORY_WARNING_MB: 512,
  MEMORY_ERROR_MB: 1024,
  NETWORK_WARNING_MS: 200,
  NETWORK_ERROR_MS: 1000,
} as const;

// R2 configuration
export const R2_CONFIG = {
  BUCKET_NAME: 'scanner-cookies',
  PROFILE_PREFIX: 'profiles/',
  COMPRESSION: 'zstd',
  EXPIRE_SECONDS: 7200, // 2 hours
} as const;

// Git/CI constants
export const CI_CONFIG = {
  PROVIDER: 'github',
  MAX_FILE_SIZE_MB: 100,
  RECOMMENDED_MAX_SIZE_MB: 50,
} as const;

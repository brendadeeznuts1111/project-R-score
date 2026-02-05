// config/r2-constants.ts - Centralized (Add to MASTER_MATRIX)
import { R2_DIRS, R2_CONSTANTS } from '../src/storage/r2-apple-manager';

export const R2_CONFIG = {
  bucket: process.env.R2_BUCKET || 'factory-wager-packages',
  dirs: R2_DIRS,
  maxKeys: R2_CONSTANTS.MAX_KEYS,
  zstdLevel: R2_CONSTANTS.ZSTD_LEVEL,
  compressionTarget: R2_CONSTANTS.COMPRESSION_TARGET
};

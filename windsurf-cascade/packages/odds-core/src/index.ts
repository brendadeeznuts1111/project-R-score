// Core package entry point - re-exports all public APIs
export * from './types';
export * from './constants';
export * from './utils';
export * from './validation';
export * from './errors';

// Bun v1.3 Enhanced APIs
export * from './config/yaml-loader';
export * from './auth/session-manager';
export * from './compression/zstd-service';
export * from './utils/resource-manager';

// Error Handling with Documentation Search
export * from './error/error-handler';
export * from './error/error-types';
export * from './error/error-middleware';

// Monitoring and API Tracking
export * from './monitoring/api-tracker';

// Re-export commonly used utilities
export { configLoader } from './config/yaml-loader';
export { sessionManager } from './auth/session-manager';
export { compressionService } from './compression/zstd-service';
export { smartErrorHandler } from './error/error-handler';
export { createError } from './error/error-types';
export { ErrorMiddleware } from './error/error-middleware';

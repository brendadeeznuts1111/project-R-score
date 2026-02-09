/**
 * Payment Routing Configuration Module
 * Centralized environment configuration with validation
 */

import { env } from 'bun';

export interface PaymentConfig {
  // Server
  port: number;
  host: string;
  nodeEnv: string;
  
  // Redis
  redisUrl: string;
  redisMaxRetries: number;
  redisRetryDelay: number;
  redisPoolSize: number;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFile: string;
  logToConsole: boolean;
  
  // Security
  apiKey?: string;
  corsOrigins: string[];
  
  // Health Checks
  healthCheckInterval: number;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = env[key];
  if (!value) return defaultValue;
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function getEnvString(key: string, defaultValue: string): string {
  return env[key] || defaultValue;
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = env[key];
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config: PaymentConfig = {
  // Server
  port: getEnvNumber('PAYMENT_PORT', 3001),
  host: getEnvString('PAYMENT_HOST', '0.0.0.0'),
  nodeEnv: getEnvString('NODE_ENV', 'development'),
  
  // Redis
  redisUrl: getEnvString('REDIS_URL', 'redis://localhost:6379'),
  redisMaxRetries: getEnvNumber('REDIS_MAX_RETRIES', 3),
  redisRetryDelay: getEnvNumber('REDIS_RETRY_DELAY', 1000),
  redisPoolSize: getEnvNumber('REDIS_POOL_SIZE', 10),
  
  // Rate Limiting
  rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
  rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // Logging
  logLevel: (getEnvString('LOG_LEVEL', 'info') as PaymentConfig['logLevel']),
  logFile: getEnvString('LOG_FILE', '/tmp/payment-routing.log'),
  logToConsole: getEnvBoolean('LOG_TO_CONSOLE', true),
  
  // Security
  apiKey: env.PAYMENT_API_KEY,
  corsOrigins: getEnvArray('CORS_ORIGINS', ['*']),
  
  // Health Checks
  healthCheckInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
};

export function validateConfig(): void {
  const errors: string[] = [];
  
  if (config.port < 1 || config.port > 65535) {
    errors.push(`Invalid port: ${config.port}`);
  }
  
  if (!config.redisUrl.startsWith('redis://') && !config.redisUrl.startsWith('rediss://')) {
    errors.push(`Invalid REDIS_URL: must start with redis:// or rediss://`);
  }
  
  if (config.nodeEnv === 'production' && !config.apiKey) {
    errors.push('PAYMENT_API_KEY is required in production');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

export default config;

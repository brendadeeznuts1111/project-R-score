/**
 * Core configuration for Fire22 Dashboard
 */

import { z } from 'zod';

// Environment configuration schema
export const EnvSchema = z.object({
  FIRE22_API_URL: z.string().url(),
  FIRE22_TOKEN: z.string().min(32),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

// Default configuration
export const defaultConfig = {
  api: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  },
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 100,
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
};

// Validate environment configuration
export const validateConfig = (env: Record<string, any>): EnvConfig => {
  return EnvSchema.parse(env);
};

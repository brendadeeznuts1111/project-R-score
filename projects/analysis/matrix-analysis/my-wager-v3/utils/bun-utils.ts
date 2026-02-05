// utils/bun-utils.ts
// Utility functions using Bun.env, Bun.main, and Bun.sleep

import { logInfo } from "../core/shared/logger.ts";

/**
 * Check if the current module is the main entry point
 */
export function isMainModule(): boolean {
  return import.meta.path === Bun.main;
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string | undefined {
  return Bun.env[key] || fallback;
}

/**
 * Set environment variable (alias for Bun.env)
 */
export function setEnv(key: string, value: string): void {
  Bun.env[key] = value;
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  await Bun.sleep(ms);
}

/**
 * Sleep until specific time
 */
export async function sleepUntil(date: Date): Promise<void> {
  await Bun.sleep(date);
}

/**
 * Execute function only if main module
 */
export async function executeIfMain<T>(
  fn: () => Promise<T> | T,
  fallback?: () => Promise<void> | void
): Promise<T | undefined> {
  if (isMainModule()) {
    return await fn();
  } else if (fallback) {
    await fallback();
  }
  return undefined;
}

/**
 * Create a periodic task with Bun.sleep
 */
export async function createPeriodicTask(
  task: () => Promise<void> | void,
  intervalMs: number,
  maxIterations?: number
): Promise<void> {
  let iterations = 0;
  
  while (maxIterations === undefined || iterations < maxIterations) {
    await task();
    await sleep(intervalMs);
    iterations++;
  }
}

/**
 * Environment-aware configuration
 */
export function getConfig() {
  return {
    isProduction: getEnv('NODE_ENV') === 'production',
    isDevelopment: getEnv('NODE_ENV') === 'development',
    port: parseInt(getEnv('PORT', '3456') || '3456'),
    logLevel: getEnv('LOG_LEVEL', 'INFO'),
    mainModule: Bun.main,
    isMain: isMainModule()
  };
}

/**
 * Demo function showing all features
 */
export async function demoBunFeatures(): Promise<void> {
  const config = getConfig();
  
  logInfo('Bun Utils Demo', {
    version: Bun.version,
    revision: Bun.revision,
    config
  });
  
  // Demonstrate environment variables
  setEnv('DEMO_TIMESTAMP', new Date().toISOString());
  logInfo('Environment set', { 
    DEMO_TIMESTAMP: getEnv('DEMO_TIMESTAMP') 
  });
  
  // Demonstrate sleep
  logInfo('Starting sleep demonstration');
  await sleep(500);
  logInfo('Slept for 500ms');
  
  // Sleep until specific time
  const futureTime = new Date(Date.now() + 1000);
  logInfo('Sleeping until specific time', { 
    until: futureTime.toISOString() 
  });
  await sleepUntil(futureTime);
  logInfo('Woke up at scheduled time');
  
  // Periodic task demo
  logInfo('Starting periodic task (3 iterations)');
  await createPeriodicTask(
    async () => {
      logInfo('Periodic task execution', { 
        iteration: new Date().toISOString() 
      });
    },
    200,
    3
  );
  
  logInfo('Bun utils demo completed');
}

// Export the demo for direct execution
if (isMainModule() && import.meta.path.endsWith('bun-utils.ts')) {
  demoBunFeatures().catch(console.error);
}

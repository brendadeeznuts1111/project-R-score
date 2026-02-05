/* Production preload script - runs inside the same isolate, before your code */

import 'dotenv/config';          // env vars if you bundle without node_modules
import { logger } from '../api/utils/logger';

// Pre-warm any caches or connections here
// This runs before your main application code

logger.info('Bun preload complete', {
  version: Bun.version,
  dbPreconnect: !!Bun.env.DATABASE_URL,
  pid: process.pid,
  timestamp: new Date().toISOString(),
  environment: Bun.env.NODE_ENV || 'development',
  userAgent: Bun.env.BUN_OPTIONS?.includes('user-agent') ? 'BettingPlatform/1.3.1' : 'default'
});

// Optional: Pre-warm UUID generation for performance
if (typeof crypto !== 'undefined' && crypto.randomUUID) {
  // Generate a test UUID to ensure crypto is ready
  const testUUID = crypto.randomUUID();
  console.log(`🔐 UUID generation ready: ${testUUID.substring(0, 8)}...`);
}

// Optional: Pre-allocate any global buffers or caches
globalThis.__bunPreloadComplete = true;

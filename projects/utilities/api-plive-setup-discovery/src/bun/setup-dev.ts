/* Development setup preload script - runs before your code in dev mode */

import 'dotenv/config';
import { logger } from '../api/utils/logger';

// Development-specific setup
logger.info('🚀 Bun development preload', {
  version: Bun.version,
  hotReload: true,
  watchMode: true,
  timestamp: new Date().toISOString(),
  environment: 'development'
});

// Enable source maps for better debugging
if (typeof Error !== 'undefined') {
  Error.stackTraceLimit = 50;
}

// Development helpers
globalThis.__devMode = true;
globalThis.__bunVersion = Bun.version;

// Log environment info
console.log(`🔧 Development mode enabled`);
console.log(`📊 Bun version: ${Bun.version}`);
console.log(`🔄 Hot reload: active`);
console.log(`👀 File watching: active`);

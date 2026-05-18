#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard Starter with User-Agent
 *
 * Ensures proper user-agent is set for all Fire22 API connections
 */

import { $ } from 'bun';

// Determine environment
const environment = process.env.NODE_ENV || 'development';
const version = '3.0.9';

// Set user-agent based on environment
let userAgent: string;
switch (environment) {
  case 'production':
    userAgent = `Fire22-Dashboard/${version}`;
    break;
  case 'staging':
    userAgent = `Fire22-Dashboard/${version} (Staging)`;
    break;
  case 'development':
    userAgent = `Fire22-Dashboard/${version} (Development; Bun/${Bun.version})`;
    break;
  default:
    userAgent = `Fire22-Dashboard/${version} (${environment})`;
}

console.info('🚀 Starting Fire22 Dashboard');
console.info(`📱 User-Agent: ${userAgent}`);
console.info(`🌍 Environment: ${environment}`);
console.info('='.repeat(60));

// Set environment variables
process.env.FIRE22_USER_AGENT = userAgent;
process.env.BUN_USER_AGENT = userAgent;

// Start the application with the user-agent flag
const args = process.argv.slice(2);
const script = args[0] || 'src/index.ts';

try {
  await $`bun --user-agent="${userAgent}" run ${script} ${args.slice(1).join(' ')}`;
} catch (error) {
  console.error('❌ Failed to start:', error);
  process.exit(1);
}

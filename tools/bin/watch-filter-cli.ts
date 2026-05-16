#!/usr/bin/env bun

/**
 * Watch Filter CLI - Enhanced --watch + --filter Integration
 * 
 * Production-hardened CLI for Bun's enhanced watch engine with
 * adaptive debounce, health checks, and real-time dashboard.
 */

import { runWatchCLI } from '../lib/watch-engine-v3.14';

// Run the enhanced watch CLI
runWatchCLI().catch(error => {
  console.error('❌ Watch CLI failed:', error);
  process.exit(1);
});

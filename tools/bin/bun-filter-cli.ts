#!/usr/bin/env bun
/**
 * Bun Filter CLI - Command-line interface for workspace package filtering
 * 
 * Usage:
 *   bun-filter-cli --filter 'ba*' test
 *   bun-filter-cli --filter 'app-*' --parallel build
 *   bun-filter-cli --filter '!test-*' deploy
 */

import { runFilterCLI } from '../lib/filter-runner';

// Run the CLI
runFilterCLI().catch(error => {
  console.error('❌ Filter CLI failed:', error);
  process.exit(1);
});

#!/usr/bin/env bun
/**
 * Minimal CLI Tool with Validation Integration
 *
 * Shows how to add validation to existing CLI tools
 * with just 2 lines of code.
 *
 * Usage:
 *   bun run lib/minimal-cli-example.ts
 */

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import {
  validateOrExit,
  setDefaults,
  showIntegrationHelp,
} from '../validation/cli-validation-integration';

async function main() {
  // Set default environment variables (optional)
  setDefaults({ NODE_ENV: 'development' });

  // Validate CLI tool before execution (1 line!)
  await validateOrExit('bun', ['--version']);

  // Your CLI logic starts here - guaranteed to be in a valid state
  console.log('🚀 CLI tool executing in validated environment!');

  // Example: Run bun command safely
  const version = await Bun.$`bun --version`.text();
  console.log(`✅ Running with Bun ${version.trim()}`);

  // Example: Show current environment
  console.log(`📊 Environment: ${Bun.env.NODE_ENV}`);
  console.log(`🔧 Platform: ${process.platform} ${process.arch}`);
}

// Handle help flag
if (process.argv.includes('--help')) {
  showIntegrationHelp();
} else {
  main().catch(error => {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  });
}

// lib/cli/minimal-cli-example.ts — Minimal CLI tool with validation integration

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
  console.info('🚀 CLI tool executing in validated environment!');

  // Example: Run bun command safely
  const version = await Bun.$`bun --version`.text();
  console.info(`✅ Running with Bun ${version.trim()}`);

  // Example: Show current environment
  console.info(`📊 Environment: ${Bun.env.NODE_ENV}`);
  console.info(`🔧 Platform: ${process.platform} ${process.arch}`);
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

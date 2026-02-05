/**
 * ci-test-runner.ts - Deterministic Validation Runner (CI)
 * Enforces CI-specific test settings: randomize=true, rerunEach=3, and 30s timeout
 */

import { spawnSync } from 'bun';

async function runCITests() {
  console.log('🏗️ Starting Deterministic Validation Runner (CI Mode)');
  
  // Settings from Ticket 10.1.1.1.2
  const ciArgs = [
    'test',
    '--ci',               // Enable CI mode
    '--coverage',         // Ensure coverage is generated for enforcer
    '--bail',             // Stop on first failure
    '--timeout', '30000', // 30s timeout for CI (escalated from 15s)
    '--rerun-each', '3'   // Rerun 3 times to detect race conditions
  ];

  console.log(`🚀 Executing: bun ${ciArgs.join(' ')}`);

  const result = spawnSync(['bun', ...ciArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'true'
    }
  });

  if (result.status !== 0) {
    console.error('❌ CI Tests failed.');
    process.exit(result.status || 1);
  }

  console.log('✅ Deterministic validation completed successfully in CI.');
}

runCITests().catch(err => {
  console.error(err);
  process.exit(1);
});
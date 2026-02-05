#!/usr/bin/env bun
/**
 * Secure test runner with security validation
 * Usage: bun run test:secure --context=ci --smol --threshold=0.9
 */

import { spawn } from 'bun';
import { parseArgs } from 'util';

const args = parseArgs({
  args: Bun.argv,
  options: {
    context: { type: 'string' },
    smol: { type: 'boolean' },
    threshold: { type: 'string' },
    'dry-run': { type: 'boolean' },
    'validate-secrets': { type: 'boolean' }
  },
  allowPositionals: true,
});

const {
  context = 'local',
  smol = false,
  threshold = '0.9',
  'dry-run': dryRun = false,
  'validate-secrets': validateSecrets = true,
} = args.values;

async function runSecurityTests() {
  console.log(`🔒 Running secure tests with context: ${context}`);
  
  // Build test command
  const testArgs = ['test'];
  
  // Add config based on context
  if (context === 'ci') {
    testArgs.push('--config=ci');
  }
  
  // Add coverage with threshold
  testArgs.push('--coverage');
  if (threshold) {
    process.env.COVERAGE_THRESHOLD = threshold;
  }
  
  // Add smol mode if requested
  if (smol) {
    testArgs.push('--smol');
  }
  
  // Add preload for security mocks
  testArgs.push('--preload', './security-mocks.ts');
  
  // Add env file
  testArgs.push('--env-file=.env.test');
  
  // Validate secrets if requested
  if (validateSecrets) {
    console.log('🔍 Validating secrets...');
    await validateSecretsInTests();
  }
  
  if (dryRun) {
    console.log('🏃 Dry run mode - command would be:', 'bun', testArgs.join(' '));
    return;
  }
  
  console.log('🚀 Executing:', 'bun', testArgs.join(' '));
  
  const proc = spawn({
    cmd: ['bun', ...testArgs],
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TEST_CONTEXT: context,
      SECURITY_VALIDATION: validateSecrets.toString()
    }
  });
  
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

async function validateSecretsInTests() {
  // Check for common secret patterns in test files
  const { readdir } = await import('fs/promises');
  const { join } = await import('path');
  
  const testDirs = ['src/__tests__', '.', 'test', 'tests'];
  const secretPatterns = [
    /password\s*=\s*['"]\w+['"]/i,
    /secret\s*=\s*['"]\w+['"]/i,
    /api_key\s*=\s*['"]\w+['"]/i,
    /token\s*=\s*['"]\w+['"]/i,
  ];
  
  for (const dir of testDirs) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
          const content = await Bun.file(join(dir, file)).text();
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              console.warn(`⚠️  Potential secret found in ${join(dir, file)}`);
            }
          }
        }
      }
    } catch (err) {
      // Directory might not exist, continue
    }
  }
  
  console.log('✅ Secret validation complete');
}

runSecurityTests().catch(console.error);

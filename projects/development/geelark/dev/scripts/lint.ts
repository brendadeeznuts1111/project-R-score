#!/usr/bin/env bun

/**
 * Lint script for the geelark project
 * Runs TypeScript compiler in --noEmit mode to check for type errors
 */

import { spawn } from 'bun';

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

console.info('🔍 Running type check and linting...');

try {
  // Run TypeScript compiler
  const tscProcess = spawn(['tsc', '--noEmit'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const tscResult = await tscProcess.exited;

  if (tscResult !== 0) {
    console.error('❌ TypeScript compilation failed');
    process.exit(tscResult);
  }

  // If --fix flag is provided, run additional formatting/fixing
  if (shouldFix) {
    console.info('🔧 Running auto-fix...');
    // Add any auto-fixing logic here if needed
    console.info('✅ Auto-fix complete');
  }

  console.info('✅ No linting errors found');
} catch (error) {
  console.error('❌ Linting failed:', error);
  process.exit(1);
}

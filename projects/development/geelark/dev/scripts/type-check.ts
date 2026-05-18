#!/usr/bin/env bun

/**
 * Type check script for the geelark project
 * Runs TypeScript compiler with strict type checking
 */

import { spawn } from 'bun';

console.info('🔍 Running TypeScript type check...');

try {
  const tscProcess = spawn(['tsc', '--noEmit', '--strict'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const result = await tscProcess.exited;

  if (result !== 0) {
    console.error('❌ Type check failed');
    process.exit(result);
  }

  console.info('✅ Type check passed');
} catch (error) {
  console.error('❌ Type check failed:', error);
  process.exit(1);
}

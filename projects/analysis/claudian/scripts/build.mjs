#!/usr/bin/env bun
/**
 * Combined build script - runs CSS build then esbuild
 * Uses Bun.spawnSync for better performance and compatibility
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Run CSS build silently
const cssBuild = Bun.spawnSync(['bun', 'scripts/build-css.mjs'], {
  cwd: ROOT,
  stdio: ['inherit', 'inherit', 'inherit']
});

if (!cssBuild.success) {
  process.exit(cssBuild.exitCode || 1);
}

// Run esbuild with args passed through
const args = process.argv.slice(2);
const esbuildCmd = Bun.spawnSync(['bun', 'esbuild.config.mjs', ...args], {
  cwd: ROOT,
  stdio: ['inherit', 'inherit', 'inherit']
});

process.exit(esbuildCmd.exitCode || 0);

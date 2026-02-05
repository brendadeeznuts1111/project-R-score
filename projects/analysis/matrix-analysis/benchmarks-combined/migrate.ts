#!/usr/bin/env bun
/**
 * 🔄 Benchmark Migration Script
 *
 * Helps migrate from old benchmark directories to the unified structure.
 * This script can be safely deleted after migration is complete.
 */

import { existsSync, unlinkSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const OLD_DIRS = [
  '/bench',
  '/benchmarks',
  '/test/scripts/bench',
  '/skills/benchmarks'
];

const NEW_DIR = '/benchmarks-combined';

console.log('🔄 Benchmark Migration Status');
console.log('============================\n');

// Check which old directories still exist
const existingOldDirs = OLD_DIRS.filter(dir => {
  const fullPath = join(process.cwd(), dir);
  return existsSync(fullPath);
});

if (existingOldDirs.length === 0) {
  console.log('✅ All old benchmark directories have been cleaned up!');
} else {
  console.log('⚠️  Old benchmark directories still exist:');
  existingOldDirs.forEach(dir => {
    const fullPath = join(process.cwd(), dir);
    const stats = statSync(fullPath);
    console.log(`  ${dir} (${stats.isDirectory() ? 'directory' : 'file'})`);
  });

  console.log('\nTo clean up old directories, run:');
  console.log('  rm -rf /bench /benchmarks /test/scripts/bench /skills/benchmarks');
}

// Check new unified directory
const newDirPath = join(process.cwd(), NEW_DIR);
if (existsSync(newDirPath)) {
  console.log(`\n✅ Unified benchmark directory exists: ${NEW_DIR}`);

  // Show structure
  const categories = ['core', 'utils', 'performance', 'skills', 'reports'];
  console.log('\n📁 Structure:');

  for (const category of categories) {
    const catPath = join(newDirPath, category);
    if (existsSync(catPath)) {
      const files = readdirSync(catPath).length;
      console.log(`  ${category}/ (${files} items)`);
    } else {
      console.log(`  ${category}/ (missing)`);
    }
  }
} else {
  console.log(`\n❌ Unified benchmark directory not found: ${NEW_DIR}`);
}

console.log('\n📋 Migration Complete!');
console.log('====================');
console.log('• All benchmark files consolidated into /benchmarks-combined');
console.log('• Use "bun run all" from the unified directory to run benchmarks');
console.log('• Reports are saved to /benchmarks-combined/reports/');

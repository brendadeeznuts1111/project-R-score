#!/usr/bin/env bun
// tools/debug-entry.ts — Debug tool for entry guard mechanism

console.info('=== Debug Entry Guard ===');
console.info('Bun.main:', Bun.main);
console.info('import.meta.path:', import.meta.path);
console.info('Are they equal?', import.meta.path === Bun.main);

import { ensureDirectExecution } from '../lib/shared/tools/entry-guard';

console.info('Imported guard successfully');

// If we get here, guard did not exit
console.info('\n✅ Script is running as main (guard allowed execution)');

#!/usr/bin/env bun
/**
 * Harness coverage floor probe.
 *
 *   bun run test:harness-coverage
 */
import { assertHarnessCoverageBaseline } from '../lib/harness/coverage-ratchet';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const failures = await assertHarnessCoverageBaseline(ROOT);
if (failures.length > 0) {
  for (const f of failures) console.error(`❌ ${f}`);
  process.exit(1);
}
process.exit(0);

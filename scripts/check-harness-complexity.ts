#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Fail closed: no lib/harness function exceeds complexity-baseline.json maxComplexity.
 *
 *   bun run check:harness-complexity
 *   bun run check:harness-complexity -- --report   # print top offenders
 */
import {
  assertComplexityFloor,
  collectHarnessComplexity,
  loadComplexityBaseline,
} from '../lib/harness/complexity';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const report = Bun.argv.includes('--report');

const baseline = await loadComplexityBaseline(ROOT);
const hits = await collectHarnessComplexity(ROOT);
hits.sort((a, b) => b.complexity - a.complexity);

if (report) {
  console.info(`scope ${baseline.scope} · maxComplexity ${baseline.maxComplexity}`);
  for (const h of hits.slice(0, 20)) {
    console.info(`  ${h.complexity.toString().padStart(3)}  ${h.file}:${h.line}  ${h.name}`);
  }
}

const failures = assertComplexityFloor(hits, baseline.maxComplexity);
if (failures.length > 0) {
  console.error('❌ harness complexity floor exceeded:');
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}

const maxSeen = hits.reduce((m, h) => Math.max(m, h.complexity), 0);
console.info(
  `✅ harness complexity · ${hits.length} functions · max seen ${maxSeen} ≤ floor ${baseline.maxComplexity}`
);
process.exit(0);

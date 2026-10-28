#!/usr/bin/env bun
import { resolvePath as resolve } from '../lib/path-bun';
import { invariantExitCode, runInvariantLanes } from '../lib/quality/invariant-runner.ts';

const results = await runInvariantLanes({
  cwd: resolve(import.meta.dir, '..'),
  inheritOutput: true,
});
const exitCode = invariantExitCode(results);
console.log(
  JSON.stringify(
    {
      passed: results.filter(result => result.exitCode === 0).length,
      failed: results.filter(result => result.exitCode !== 0).length,
      durationNs: results.reduce((sum, result) => sum + result.durationNs, 0),
      lanes: results,
    },
    null,
    2
  )
);
process.exit(exitCode);

#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/test/code-coverage — Bun-native coverage flags
import {
  buildFocusedCoveragePlan,
  FocusedCoverageUsageError,
  runFocusedCoveragePlan,
} from '../lib/harness/focused-coverage.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');

function usage(): void {
  console.log(`Usage: bun run test:coverage -- <test-file...> [test flags]

Runs exact repository test files with text + LCOV coverage written to
coverage/focused. Files must precede flags.

Examples:
  bun run test:coverage -- tests/model-circuit-contracts.test.ts
  bun run test:coverage -- tests/limit-betlog-export.test.ts --test-name-pattern="API"
  bun run test:coverage -- tests/agent-odds-http.test.ts -t "validates simulator" --bail=1

Owned safety boundaries:
  exact .test/.spec files only · one-shot · no --changed/--watch · no snapshot updates
  coverage reporters and directory are fixed by the wrapper

Wrapper inspection:
  --dry-run [--json]   validate and print the normalized command without running it
`);
}

async function main(): Promise<number> {
  const raw = Bun.argv.slice(2);
  if (raw.includes('--help') || raw.includes('-h')) {
    usage();
    return 0;
  }
  const dryRun = raw.includes('--dry-run');
  const json = raw.includes('--json');
  const argv = raw.filter(arg => arg !== '--dry-run' && arg !== '--json');
  try {
    const plan = await buildFocusedCoveragePlan(argv, ROOT);
    if (dryRun) {
      if (json) jsonOut(plan);
      else console.log(`bun ${plan.bunArgs.join(' ')}`);
      return 0;
    }
    if (json) {
      throw new FocusedCoverageUsageError('--json requires --dry-run');
    }
    console.log(`→ bun ${plan.bunArgs.join(' ')}`);
    return runFocusedCoveragePlan(plan, ROOT);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`test:coverage: ${message}`);
    if (error instanceof FocusedCoverageUsageError) usage();
    return 2;
  }
}

if (import.meta.main) process.exit(await main());

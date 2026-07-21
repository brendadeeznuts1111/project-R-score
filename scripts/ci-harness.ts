#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * CI / agent-visible harness gate envelope.
 * Quiet success; on failure prints invariant · owner · repair command.
 *
 *   bun run ci:harness
 */
import { CI_SPINE_SMOKE_TESTS, CRITICAL_PROOF_PATHS } from '../lib/harness/proof';

type Step = { name: string; cmd: string[]; owner: string; repair: string };

const steps: Step[] = [
  {
    name: 'proof:install',
    cmd: ['bun', 'run', 'proof:install'],
    owner: 'docs/harness/PROOF.md · install-verify',
    repair: 'bun run proof:install',
  },
  {
    name: 'path-bun',
    cmd: ['bun', 'run', 'check:path-bun'],
    owner: 'lib/path-bun.ts · scripts/check-path-bun.ts',
    repair: 'bun run check:path-bun',
  },
  {
    name: 'bun-env',
    cmd: ['bun', 'run', 'check:bun-env'],
    owner: 'scripts/check-bun-env.ts',
    repair: 'bun run check:bun-env',
  },
  {
    name: 'eslint-bun-native',
    cmd: ['bun', 'run', 'lint:bun-native:rollout'],
    owner: 'eslint.bun-native.config.ts · --max-warnings 0 (pre-commit)',
    repair: 'bun run lint:bun-native:rollout',
  },
  {
    name: 'brands-smart',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict'],
    owner: 'lib/types/branded.ts · branded-ids skill',
    repair: 'bun tools/branded-id-check.ts --smart --strict',
  },
  {
    name: 'spine-smokes',
    cmd: ['bun', 'test', ...CI_SPINE_SMOKE_TESTS],
    owner: 'lib/harness/proof.ts · CI_SPINE_SMOKE_TESTS · docs/BUN_NATIVE_CAPABILITIES.md',
    repair: `bun test ${CI_SPINE_SMOKE_TESTS.join(' ')}`,
  },
];

async function run(step: Step): Promise<number> {
  console.info(`→ ${step.name}`);
  const proc = Bun.spawn(step.cmd, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
  return (await proc.exited) ?? 1;
}

console.info('FactoryWager ci:harness');
console.info(`Proof catalog: ${CRITICAL_PROOF_PATHS.length} named paths (lib/harness/proof.ts)`);
console.info('');

for (const step of steps) {
  const code = await run(step);
  if (code !== 0) {
    console.error('');
    console.error(`❌ ${step.name} failed`);
    console.error(`   invariant: harness gate must exit 0`);
    console.error(`   owner: ${step.owner}`);
    console.error(`   repair: ${step.repair}`);
    process.exit(code);
  }
}

console.info('');
console.info('✅ ci:harness passed');

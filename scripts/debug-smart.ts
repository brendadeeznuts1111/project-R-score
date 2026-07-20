#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// Simplified progressive debug for immediate use

const phases = [
  { depth: 1, name: 'Quick Scan' },
  { depth: 3, name: 'Standard Debug' },
  { depth: 5, name: 'Deep Analysis' },
] as const;

for (const phase of phases) {
  console.info(`\n Phase: ${phase.name} (depth=${phase.depth})`);
  const proc = Bun.spawn(['bun', 'run', ...Bun.argv.slice(2)], {
    env: { ...Bun.env, BUN_CONSOLE_DEPTH: phase.depth.toString() },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode === 0) break;
}

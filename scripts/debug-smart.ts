#!/usr/bin/env bun
// Simplified progressive debug for immediate use

const phases = [
  { depth: 1, name: 'Quick Scan' },
  { depth: 3, name: 'Standard Debug' },
  { depth: 5, name: 'Deep Analysis' },
] as const;

for (const phase of phases) {
  console.log(`\n Phase: ${phase.name} (depth=${phase.depth})`);
  const proc = Bun.spawn(['bun', 'run', ...Bun.argv.slice(2)], {
    env: { ...process.env, BUN_CONSOLE_DEPTH: phase.depth.toString() },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await proc.exited;
  if (exitCode === 0) break;
}

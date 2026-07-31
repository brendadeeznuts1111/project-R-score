#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/** Local-only merge proof. GitHub Actions is intentionally disabled. */

const repoRoot = `${import.meta.dir}/..`;

const steps = [
  {
    name: 'nested-registry-install',
    command: ['bun', 'install', '--frozen-lockfile'],
    cwd: `${repoRoot}/projects/active/factorywager/registry`,
  },
  { name: 'core', command: ['bun', 'run', 'ci:core'], cwd: repoRoot },
  { name: 'types', command: ['bun', 'run', 'ci:types'], cwd: repoRoot },
  { name: 'security', command: ['bun', 'run', 'ci:security'], cwd: repoRoot },
  {
    name: 'portal-registry',
    command: ['bun', 'run', 'ci:portal-registry'],
    cwd: repoRoot,
  },
] as const;

for (const step of steps) {
  console.info(`\n== bun:ci · ${step.name} ==`);
  const proc = Bun.spawn([...step.command], {
    cwd: step.cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = (await proc.exited) ?? 1;
  if (exitCode !== 0) {
    console.error(`bun:ci failed at ${step.name}`);
    process.exit(exitCode);
  }
}

console.info('\n✅ bun:ci local merge proof passed');

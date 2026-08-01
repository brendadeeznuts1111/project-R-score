#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Machine Bun policy + runtime health — delegates to kimi-toolchain machine-bun.
 */

import { bunSpawnArgs } from '../lib/bun-executable.ts';

const ROOT = `${import.meta.dir}/..`;

function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

async function resolveMachineBunEntry(): Promise<string | null> {
  const candidates = [
    Bun.env.KIMI_TOOLCHAIN_ROOT
      ? joinPath(Bun.env.KIMI_TOOLCHAIN_ROOT, 'src/bin/machine-bun.ts')
      : null,
    joinPath(ROOT, '..', 'kimi-toolchain', 'src/bin/machine-bun.ts'),
    joinPath(Bun.env.HOME ?? Bun.env.USERPROFILE ?? '', 'kimi-toolchain/src/bin/machine-bun.ts'),
  ].filter((p): p is string => Boolean(p));

  for (const entry of candidates) {
    if (await Bun.file(entry).exists()) return entry;
  }
  return null;
}

const entry = await resolveMachineBunEntry();
if (!entry) {
  console.error(
    'install:machine:health: kimi-toolchain machine-bun.ts not found. Set KIMI_TOOLCHAIN_ROOT or clone ../kimi-toolchain.'
  );
  process.exit(1);
}

const proc = Bun.spawn(bunSpawnArgs([entry, ...Bun.argv.slice(2)]), {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: { ...Bun.env },
});

process.exit(await proc.exited);

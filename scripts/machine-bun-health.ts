#!/usr/bin/env bun
/**
 * Machine Bun policy + runtime health — delegates to kimi-toolchain machine-bun.
 */
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');

async function resolveMachineBunEntry(): Promise<string | null> {
  const candidates = [
    Bun.env.KIMI_TOOLCHAIN_ROOT
      ? join(Bun.env.KIMI_TOOLCHAIN_ROOT, 'src/bin/machine-bun.ts')
      : null,
    join(ROOT, '..', 'kimi-toolchain', 'src/bin/machine-bun.ts'),
    join(Bun.env.HOME ?? Bun.env.USERPROFILE ?? '', 'kimi-toolchain/src/bin/machine-bun.ts'),
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

const proc = Bun.spawn(['bun', entry, ...Bun.argv.slice(2)], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: Bun.env as Record<string, string>,
});

process.exit(await proc.exited);

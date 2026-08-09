#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/read-file/watch — fs.watch (the documented
//     Bun watch API — `Bun.watch` is undefined in Bun 1.4.0-canary, verified)
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// tools/partner-watch.ts — watch-mode for the partner profile + dashboard bake loop.
//
//   bun run partner:watch            # initial bake, then watch + re-bake on change
//   bun run partner:watch --once     # single bake, exit
//   bun run partner:watch --debounce-ms 200
//
// Watches accounting SOURCES (config/partner-profiles/*.toml, data/operations.db)
// and on change re-runs profile bake → coverage → partners-dashboard → ledger
// validate. Out inventory lives in private profile outs; partners-ops is not
// part of this loop (optional: bun run partners:build).
// Output registry files are ignored so self-writes don't retrigger.
//
// @see docs/design/settlement-feed.md — materialization loop
// @see scripts/refresh-partners-dashboard.ts — operator one-shot with handshake

// Bun has no native file-watch API (`Bun.watch` undefined) — fs.watch is the
// documented Bun-supported surface; disable the no-restricted-imports rule.
// eslint-disable-next-line no-restricted-imports -- file-watch only; Bun.watch does not exist
import { watch, type FSWatcher } from 'node:fs';
import { joinPath } from '../lib/path-bun';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

export const WATCH_ROOTS = ['config/partner-profiles', 'data', 'public/registry'];

/** Source files that trigger a re-bake (outputs deliberately excluded). */
export function shouldRebake(relativePath: string): boolean {
  const p = relativePath.replace(/\\/g, '/');
  if (p.startsWith('config/partner-profiles/') && p.endsWith('.toml')) return true;
  if (p === 'data/operations.db') return true;
  // Optional seat desk still useful for other surfaces; not required for outs SSOT.
  if (p === 'public/registry/seat-capital-desk.json') return true;
  return false;
}

/** Ordered bake steps for the profile → dashboard loop (no partners-ops). */
export const WATCH_BAKE_COMMANDS: readonly (readonly string[])[] = [
  ['bun', 'run', 'partner-profile:bake'],
  ['bun', 'run', 'partner-profile:coverage:bake'],
  ['bun', 'run', 'partner:dashboard:bake'],
  ['bun', 'run', 'validate:ledger'],
] as const;

async function runBakes(): Promise<void> {
  const started = new Date().toISOString();
  console.log(`\n[${started}] re-baking …`);
  for (const cmd of WATCH_BAKE_COMMANDS) {
    const proc = Bun.spawn([...cmd], { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
    const code = await proc.exited;
    if (code !== 0) {
      console.error(`  ✗ ${cmd.join(' ')} exited ${code}`);
      return;
    }
  }
  console.log(`  ✓ bake loop complete (${new Date().toISOString()})`);
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('partner:watch', Bun.argv.slice(2));
  const once = argv.includes('--once');
  const debounceMs = Number(argv[argv.indexOf('--debounce-ms') + 1] ?? 500) || 500;

  await runBakes();
  if (once) return;

  const watchers: FSWatcher[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void runBakes();
    }, debounceMs);
  };

  for (const root of WATCH_ROOTS) {
    const watcher = watch(
      joinPath(process.cwd(), root),
      { recursive: true },
      (_event, filename) => {
        if (filename && shouldRebake(joinPath(root, String(filename)))) {
          schedule();
        }
      }
    );
    watchers.push(watcher);
  }

  console.log(
    `partner:watch · watching ${WATCH_ROOTS.join(', ')} · debounce ${debounceMs}ms · Ctrl+C to stop`
  );

  process.on('SIGINT', () => {
    for (const w of watchers) w.close();
    process.exit(0);
  });
}

if (import.meta.main) {
  await main();
}

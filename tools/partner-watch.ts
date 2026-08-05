#!/usr/bin/env bun
// @see https://bun.com/docs/guides/read-file/watch — fs.watch (the documented
//     Bun watch API — `Bun.watch` is undefined in Bun 1.4.0-canary, verified)
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// tools/partner-watch.ts — watch-mode for the accounting bake loop.
//
//   bun run partner:watch            # initial bake, then watch + re-bake on change
//   bun run partner:watch --once     # single bake, exit
//   bun run partner:watch --debounce-ms 200
//
// Watches the accounting SOURCES (config/partner-profiles/*.toml,
// data/operations.db, public/registry/seat-capital-desk.json) and on change
// re-runs partner-profile:bake + partners:build + validate:ledger — the loop
// that materializes profiles → unified registry → partners-ops projection.
// Output registry files (partner-profiles.json, partners-ops.json,
// domain-glossary.json …) are ignored so self-writes don't retrigger.
//
// @see docs/design/settlement-feed.md — materialization loop

// Bun has no native file-watch API (`Bun.watch` undefined) — fs.watch is the
// documented Bun-supported surface; disable the no-restricted-imports rule.
// eslint-disable-next-line no-restricted-imports -- file-watch only; Bun.watch does not exist
import { watch, type FSWatcher } from 'node:fs';
import { joinPath } from '../lib/path-bun';

export const WATCH_ROOTS = ['config/partner-profiles', 'data', 'public/registry'];

/** Source files that trigger a re-bake (outputs deliberately excluded). */
export function shouldRebake(relativePath: string): boolean {
  const p = relativePath.replace(/\\/g, '/');
  if (p.startsWith('config/partner-profiles/') && p.endsWith('.toml')) return true;
  if (p === 'data/operations.db') return true;
  if (p === 'public/registry/seat-capital-desk.json') return true;
  return false;
}

async function runBakes(): Promise<void> {
  const started = new Date().toISOString();
  console.log(`\n[${started}] re-baking …`);
  for (const cmd of [
    ['bun', 'run', 'partner-profile:bake'],
    ['bun', 'run', 'partners:build'],
    ['bun', 'run', 'validate:ledger'],
  ]) {
    const proc = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
    const code = await proc.exited;
    if (code !== 0) {
      console.error(`  ✗ ${cmd.join(' ')} exited ${code}`);
      return;
    }
  }
  console.log(`  ✓ bake loop complete (${new Date().toISOString()})`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
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
          console.log(`  · change: ${joinPath(root, String(filename))}`);
          schedule();
        }
      }
    );
    watchers.push(watcher);
  }

  console.log(`watching ${WATCH_ROOTS.join(', ')} (debounce ${debounceMs}ms) — Ctrl+C to stop`);
  process.on('SIGINT', () => {
    for (const w of watchers) w.close();
    process.exit(0);
  });
  await new Promise(() => {}); // keep alive
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

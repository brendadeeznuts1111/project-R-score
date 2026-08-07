#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/child-process — Subprocess.kill / .exited
// @see https://bun.com/docs/runtime/watch-mode — bun --watch / --hot
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { resolvePath } from '../lib/path-bun.ts';
import { createShutdown } from './lib/graceful-shutdown.ts';

/**
 * One-command portal dev loop: theme sync watcher + hot dev server.
 *
 *   bun scripts/dev-portal.ts
 *   bun run dev:portal:theme
 *
 * Spawns:
 *   bun --watch tools/sync-portal-theme.ts   # regenerate theme-tokens.css on theme.jsonc edit
 *   bun --hot  scripts/serve-public.ts       # local portal server (soft reload)
 *
 * Ctrl-C (SIGINT) stops both children and exits 130. If either child exits
 * on its own, the whole loop tears down with that child's exit code.
 */
const ROOT = resolvePath(import.meta.dir, '..');

async function main(): Promise<void> {
  const bunBin = process.execPath.includes('bun') ? process.execPath : 'bun';

  const children = [
    Bun.spawn([bunBin, '--watch', 'tools/sync-portal-theme.ts'], {
      cwd: ROOT,
      stdio: ['inherit', 'inherit', 'inherit'],
    }),
    Bun.spawn([bunBin, '--hot', 'scripts/serve-public.ts'], {
      cwd: ROOT,
      stdio: ['inherit', 'inherit', 'inherit'],
    }),
  ];

  const shutdown = createShutdown({ name: 'dev-portal', autoExit: true });
  shutdown.onCleanup(() => {
    for (const child of children) {
      child.kill('SIGTERM');
    }
  });

  // Tear down the whole loop as soon as the first child exits (e.g. the
  // server fails to bind) instead of waiting on the never-exiting watcher.
  const exitCode = await Promise.race(children.map(child => child.exited));
  shutdown.dispose();
  process.exit(exitCode);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { main as devPortal };

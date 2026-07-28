#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
// @see https://bun.com/docs/runtime/cron#bun-cron-remove
// @see https://bun.com/docs/runtime/cron#bun-cron-parse
/**
 * OS-level Bun.cron for portal scope-aware snapshots (primary, reboot-surviving).
 *
 *   bun run portal:snapshot:cron:register
 *   bun run portal:snapshot:cron:preview
 *   bun run portal:snapshot:cron:remove
 */
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import {
  PORTAL_SNAPSHOT_CRON_TITLE,
  PORTAL_SNAPSHOT_OS_SCHEDULE,
  PORTAL_SNAPSHOT_CRON_WORKER,
  resolvePortalSnapshotCronTitle,
  resolvePortalSnapshotOsSchedule,
  resolvePortalSnapshotScopes,
} from './portal-snapshot-cron-constants.ts';

export { PORTAL_SNAPSHOT_CRON_WORKER } from './portal-snapshot-cron-constants.ts';

type Command = 'register' | 'remove' | 'preview';

function previewFireTimes(expression: string, count: number, from?: Date | number): Date[] {
  const out: Date[] = [];
  let cursor: Date | number = from ?? Date.now();
  for (let i = 0; i < count; i++) {
    const next = parseCron(expression, cursor);
    if (!next) break;
    out.push(next);
    cursor = next.getTime() + 1;
  }
  return out;
}

function parseArgv(
  argv: string[]
): { command: Command; schedule: string; title: string; count: number } | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['register', 'remove', 'preview'].includes(command)) return null;

  let schedule = resolvePortalSnapshotOsSchedule();
  let title = resolvePortalSnapshotCronTitle();
  let count = 3;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--schedule' && argv[i + 1]) schedule = argv[++i]!;
    else if (a.startsWith('--schedule=')) schedule = a.slice('--schedule='.length);
    else if (a === '--title' && argv[i + 1]) title = argv[++i]!;
    else if (a.startsWith('--title=')) title = a.slice('--title='.length);
    else if (a === '--count' && argv[i + 1]) count = Number.parseInt(argv[++i]!, 10) || 3;
  }

  return { command, schedule, title, count: Math.max(1, count) };
}

async function main(): Promise<void> {
  const opts = parseArgv(Bun.argv.slice(2));
  if (!opts) {
    const scopes = resolvePortalSnapshotScopes().join(',');
    console.log(`Usage: bun tools/portal-snapshot-cron.ts <register|remove|preview> [options]

OS Bun.cron for portal-cli snapshot capture (scope-aware data-plane).

Options:
  --schedule <expr>   Default: ${PORTAL_SNAPSHOT_OS_SCHEDULE} (system local time)
  --title <id>        Default: ${PORTAL_SNAPSHOT_CRON_TITLE}
  --count <n>         Preview fires (default 3)

Env:
  PORTAL_SNAPSHOT_OS_SCHEDULE       OS schedule (local time)
  PORTAL_SNAPSHOT_INPROCESS_SCHEDULE  In-process schedule (UTC; serve-public)
  PORTAL_SNAPSHOT_SCOPES            Comma scopes (default: prediction)
  PORTAL_SNAPSHOT_CRON_TITLE
  SNAPSHOT_BASE_URL                 Fetch origin
  PORTAL_SNAPSHOT_DIR               Output root

Scopes (current): ${scopes}
Worker: ${PORTAL_SNAPSHOT_CRON_WORKER}
Logs (macOS): /tmp/bun.cron.${PORTAL_SNAPSHOT_CRON_TITLE}.stdout.log

In-process complement (while serve-public runs):
  PORTAL_SNAPSHOT_CRON=1 bun run serve:public:hot
`);
    process.exit(1);
  }

  switch (opts.command) {
    case 'register': {
      await registerOsCron(PORTAL_SNAPSHOT_CRON_WORKER, opts.schedule, opts.title);
      console.log(`Registered OS cron "${opts.title}"`);
      console.log(`  worker: ${PORTAL_SNAPSHOT_CRON_WORKER}`);
      console.log(`  schedule: ${opts.schedule} (system local time)`);
      console.log(`  scopes: ${resolvePortalSnapshotScopes().join(', ')}`);
      console.log(`  logs: /tmp/bun.cron.${opts.title}.stdout.log`);
      break;
    }
    case 'remove': {
      await removeOsCron(opts.title);
      console.log(`Removed OS cron "${opts.title}" (if present)`);
      break;
    }
    case 'preview': {
      const times = previewFireTimes(opts.schedule, opts.count);
      console.log(`Schedule: ${opts.schedule} (OS local) · title=${opts.title}`);
      console.log(`Next ${times.length} fire(s) (UTC via Bun.cron.parse preview):`);
      for (const t of times) console.log(`  ${t.toISOString()}`);
      break;
    }
  }
}

if (import.meta.main) main();

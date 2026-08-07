// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — Bun.cron(path, schedule, title)
// tools/partner-settlement-cron.ts — OS-level Bun.cron for the weekly
// settlement runner (primary, reboot-surviving).
//
//   bun run partner:settlement:cron:register    # register (Sunday midnight, system local)
//   bun run partner:settlement:cron:remove      # remove
//   bun run partner:settlement:cron:preview     # preview next fire times
//
// The worker module (lib/partner-profile/settlement-cron-worker.ts) runs the
// weekly settlement sweep for every partner profile with a commissionPct.
// Schedule uses **system local** time (Bun OS cron); the in-process
// complement `--cron` on partner:settlement:run is UTC.
//
// @see docs/design/settlement-feed.md — cron cadence

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import { SETTLEMENT_CRON_SCHEDULE } from '../lib/partner-profile/settlement-runner';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

export const SETTLEMENT_CRON_WORKER =
  '/Users/nolarose/Projects/lib/partner-profile/settlement-cron-worker.ts';
export const SETTLEMENT_CRON_TITLE = 'partner-settlement';

function previewFireTimes(expression: string, count: number, from?: Date | number): Date[] {
  const times: Date[] = [];
  let cursor = from ?? Date.now();
  for (let i = 0; i < count; i++) {
    const next = parseCron(expression, cursor);
    if (!next) break;
    times.push(next);
    cursor = next.getTime() + 1000;
  }
  return times;
}

type Command = 'register' | 'remove' | 'preview';

function parseArgv(
  argv: string[]
): { command: Command; schedule: string; title: string; count: number } | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['register', 'remove', 'preview'].includes(command)) return null;
  let schedule = SETTLEMENT_CRON_SCHEDULE;
  let title = SETTLEMENT_CRON_TITLE;
  let count = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--schedule' && argv[i + 1]) schedule = argv[++i]!;
    else if (a === '--title' && argv[i + 1]) title = argv[++i]!;
    else if (a === '--count' && argv[i + 1]) count = Number.parseInt(argv[++i]!, 10) || 3;
  }
  return { command, schedule, title, count };
}

async function main(): Promise<void> {
  const opts = parseArgv(
    applyUnknownLongOptionGuardFor('partner:settlement:cron:preview', Bun.argv.slice(2))
  );
  if (!opts) {
    console.log(`Usage: bun tools/partner-settlement-cron.ts <register|remove|preview> [options]
OS Bun.cron for the weekly partner settlement runner.
  --schedule <cron>  Override schedule (default ${SETTLEMENT_CRON_SCHEDULE}, system local)
  --title <name>     Cron title (default ${SETTLEMENT_CRON_TITLE})
  --count <n>        Preview fire count (default 3)`);
    process.exit(1);
  }
  switch (opts.command) {
    case 'register': {
      await registerOsCron(SETTLEMENT_CRON_WORKER, opts.schedule, opts.title);
      console.log(`Registered OS cron "${opts.title}"`);
      console.log(`  worker: ${SETTLEMENT_CRON_WORKER}`);
      console.log(`  schedule: ${opts.schedule} (system local time)`);
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

if (isModuleEntrypoint(import.meta)) main();

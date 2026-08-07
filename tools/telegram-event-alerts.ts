// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — Bun.cron(path, schedule, title)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// tools/telegram-event-alerts.ts — real-time event alert CLI (run/cron).
//
//   bun run telegram:event-alerts                     # scan once (baseline on empty seen-set)
//   bun run telegram:event-alerts -- --baseline        # force baseline (record, no alerts)
//   bun run telegram:event-alerts:cron:register        # register OS Bun.cron (every 5 min)
//   bun run telegram:event-alerts:cron:remove          # remove

import { colorize, logTable } from '../lib/console-depth.ts';
import { registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import { runEventAlerts } from '../lib/telegram/event-alerts.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

export const EVENT_ALERTS_SCHEDULE = Bun.env.EVENT_ALERTS_SCHEDULE ?? '*/5 * * * *';
export const EVENT_ALERTS_TITLE = 'telegram-event-alerts';
export const EVENT_ALERTS_WORKER = `${import.meta.dir}/../scripts/telegram-event-alerts-cron.ts`;

type Command = 'run' | 'register' | 'remove';

function parseArgv(
  argv: string[]
): { command: Command; schedule: string; title: string; baseline: boolean } | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['run', 'register', 'remove'].includes(command)) return null;
  let schedule = EVENT_ALERTS_SCHEDULE;
  let title = EVENT_ALERTS_TITLE;
  let baseline = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--schedule' && argv[i + 1]) schedule = argv[++i]!;
    else if (a === '--title' && argv[i + 1]) title = argv[++i]!;
    else if (a === '--baseline') baseline = true;
  }
  return { command, schedule, title, baseline };
}

async function main(): Promise<void> {
  const opts = parseArgv(
    applyUnknownLongOptionGuardFor('telegram:event-alerts', Bun.argv.slice(2))
  );
  if (!opts) {
    console.log(`Usage: bun tools/telegram-event-alerts.ts <run|register|remove> [options]
Options: --schedule <cron> · --title <name> · --baseline`);
    process.exit(2);
  }

  switch (opts.command) {
    case 'register':
      await registerOsCron(EVENT_ALERTS_WORKER, opts.schedule, opts.title);
      console.log(
        colorize(
          `registered "${opts.title}" · schedule ${opts.schedule} (system local) · worker ${EVENT_ALERTS_WORKER}`,
          '#3fb950'
        )
      );
      return;
    case 'remove':
      await removeOsCron(opts.title);
      console.log(colorize(`removed "${opts.title}"`, '#3fb950'));
      return;
    case 'run': {
      let result: Awaited<ReturnType<typeof runEventAlerts>>;
      try {
        result = await runEventAlerts(opts.baseline ? { baseline: true } : {});
      } catch (err) {
        console.error(
          colorize(`telegram:event-alerts · ${err instanceof Error ? err.message : err}`, '#f85149')
        );
        process.exitCode = 1;
        return;
      }
      logTable(
        [
          {
            feeds: result.feeds,
            seen: result.seen,
            alerted: result.alerted,
            skippedPartners: result.skippedPartners,
            failed: result.failed.length,
            firstRun: result.firstRun,
          },
        ],
        ['feeds', 'seen', 'alerted', 'skippedPartners', 'failed', 'firstRun']
      );
      for (const f of result.failed) console.error(`  ✗ ${f.eventKey}: ${f.error}`);
      if (result.failed.length > 0) process.exitCode = 1;
      return;
    }
  }
}

if (import.meta.main) {
  await main();
}

// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — Bun.cron(path, schedule, title)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// tools/telegram-daily-report.ts — daily capacity report CLI (run/preview/cron).
//
//   bun run telegram:daily-report                # publish now
//   bun run telegram:daily-report:preview        # print report texts, no send
//   bun run telegram:daily-report:cron:register  # register OS Bun.cron (09:00 local)
//   bun run telegram:daily-report:cron:remove    # remove
//   bun run telegram:daily-report:cron:preview   # preview next fire times
//
// The worker module (scripts/telegram-daily-report-cron.ts) runs the publish
// loop; schedule uses **system local** time (Bun OS cron).

import { colorize, logTable } from '../lib/console-depth.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import {
  buildDailyCapacityReportText,
  runDailyCapacityReport,
} from '../lib/telegram/daily-capacity-report.ts';
import { buildSeatCapitalDeskSnapshot } from '../lib/telegram/seat-desk-snapshot.ts';

export const TELEGRAM_DAILY_REPORT_SCHEDULE = Bun.env.TELEGRAM_DAILY_REPORT_SCHEDULE ?? '0 9 * * *';
export const TELEGRAM_DAILY_REPORT_TITLE = 'telegram-daily-capacity-report';
export const TELEGRAM_DAILY_REPORT_WORKER = `${import.meta.dir}/../scripts/telegram-daily-report-cron.ts`;

type Command = 'run' | 'preview' | 'register' | 'remove';

function parseArgv(
  argv: string[]
): { command: Command; schedule: string; title: string; count: number } | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['run', 'preview', 'register', 'remove'].includes(command)) return null;
  let schedule = TELEGRAM_DAILY_REPORT_SCHEDULE;
  let title = TELEGRAM_DAILY_REPORT_TITLE;
  let count = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--schedule' && argv[i + 1]) schedule = argv[++i]!;
    else if (a === '--title' && argv[i + 1]) title = argv[++i]!;
    else if (a === '--count' && argv[i + 1]) count = Number.parseInt(argv[++i]!, 10) || 3;
  }
  return { command, schedule, title, count };
}

async function preview(): Promise<void> {
  const snapshot = await buildSeatCapitalDeskSnapshot();
  console.log(
    colorize(`telegram:daily-report:preview · ${snapshot.rows.length} desk row(s)`, '#8b949e')
  );
  for (const view of snapshot.rows.slice(0, 20)) {
    console.log('');
    console.log(buildDailyCapacityReportText(view));
  }
}

async function main(): Promise<void> {
  const opts = parseArgv(Bun.argv.slice(2));
  if (!opts) {
    console.log(`Usage: bun tools/telegram-daily-report.ts <run|preview|register|remove> [options]
OS Bun.cron for the daily partner capacity report.
Options: --schedule <cron> · --title <name> · --count <n>`);
    process.exit(2);
  }

  switch (opts.command) {
    case 'preview':
      await preview();
      return;
    case 'register':
      await registerOsCron(TELEGRAM_DAILY_REPORT_WORKER, opts.schedule, opts.title);
      console.log(
        colorize(
          `registered "${opts.title}" · schedule ${opts.schedule} (system local) · worker ${TELEGRAM_DAILY_REPORT_WORKER}`,
          '#3fb950'
        )
      );
      return;
    case 'remove':
      await removeOsCron(opts.title);
      console.log(colorize(`removed "${opts.title}"`, '#3fb950'));
      return;
    case 'run': {
      let result: Awaited<ReturnType<typeof runDailyCapacityReport>>;
      try {
        result = await runDailyCapacityReport();
      } catch (err) {
        console.error(
          colorize(`telegram:daily-report · ${err instanceof Error ? err.message : err}`, '#f85149')
        );
        process.exitCode = 1;
        return;
      }
      logTable(
        [
          {
            desks: result.desks,
            sent: result.sent,
            skipped: result.skipped.length,
            failed: result.failed.length,
          },
        ],
        ['desks', 'sent', 'skipped', 'failed']
      );
      for (const f of result.failed) console.error(`  ✗ ${f.partnerCode}: ${f.error}`);
      if (result.failed.length > 0) process.exitCode = 1;
      return;
    }
  }
}

if (import.meta.main) {
  await main();
}

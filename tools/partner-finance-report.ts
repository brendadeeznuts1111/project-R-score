// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — Bun.cron(path, schedule, title)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// tools/partner-finance-report.ts — daily finance report CLI (run/preview/cron).
//
//   bun run partner:finance-report                     # publish now (7-day window)
//   bun run partner:finance-report -- --days=7 --partner=ACME
//   bun run partner:finance-report:preview             # print report texts, no send
//   bun run partner:finance-report:cron:register       # register OS Bun.cron (09:00 local)
//   bun run partner:finance-report:cron:remove         # remove
//   bun run partner:finance-report:cron:preview        # preview next fire times

import { colorize, logTable } from '../lib/console-depth.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import {
  buildFinanceReportText,
  runDailyFinanceReport,
} from '../lib/telegram/daily-finance-report.ts';
import { aggregatePartnerFinance } from '../lib/partner-profile/finance-report.ts';
import { openFinanceReportDb } from '../lib/telegram/daily-finance-report.ts';
import { getPartnerVisual } from '../lib/telegram/partner-visuals.ts';

export const FINANCE_REPORT_SCHEDULE = Bun.env.FINANCE_REPORT_SCHEDULE ?? '0 9 * * *';
export const FINANCE_REPORT_TITLE = 'partner-finance-report';
export const FINANCE_REPORT_WORKER = `${import.meta.dir}/../scripts/partner-finance-report-cron.ts`;

type Command = 'run' | 'preview' | 'cron-preview' | 'register' | 'remove';

function parseArgv(argv: string[]): {
  command: Command;
  schedule: string;
  title: string;
  days: number;
  partnerCode?: string;
  count: number;
} | null {
  const positional = argv.filter(a => !a.startsWith('-'));
  const command = positional[0] as Command | undefined;
  if (!command || !['run', 'preview', 'cron-preview', 'register', 'remove'].includes(command)) {
    return null;
  }
  let schedule = FINANCE_REPORT_SCHEDULE;
  let title = FINANCE_REPORT_TITLE;
  let days = 7;
  let partnerCode: string | undefined;
  let count = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--schedule' && argv[i + 1]) schedule = argv[++i]!;
    else if (a === '--title' && argv[i + 1]) title = argv[++i]!;
    else if (a === '--days' && argv[i + 1]) days = Number.parseInt(argv[++i]!, 10) || 7;
    else if (a === '--partner' && argv[i + 1]) partnerCode = argv[++i]!.toUpperCase();
    else if (a === '--count' && argv[i + 1]) count = Number.parseInt(argv[++i]!, 10) || 3;
  }
  return { command, schedule, title, days, partnerCode, count };
}

async function preview(opts: { days: number; partnerCode?: string }): Promise<void> {
  const db = openFinanceReportDb();
  try {
    const summaries = aggregatePartnerFinance(db, {
      days: opts.days,
      ...(opts.partnerCode ? { partnerCode: opts.partnerCode } : {}),
    });
    console.log(
      colorize(`partner:finance-report:preview · ${summaries.length} partner(s)`, '#8b949e')
    );
    for (const s of summaries.slice(0, 20)) {
      console.log('');
      const vis = getPartnerVisual(s.partnerCode);
      const net = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: s.currency,
      }).format(s.netFlow);
      console.log(`${vis.ansi}${s.partnerCode}\x1b[0m · ${s.entries} entries · net ${net}`);
      console.log(buildFinanceReportText(s));
    }
  } finally {
    db.close();
  }
}

function previewCron(schedule: string, count: number): void {
  const rows: Array<{ fire: number; at: string }> = [];
  let relative: Date | number | undefined;
  for (let fire = 1; fire <= Math.max(1, Math.min(count, 20)); fire++) {
    const at = parseCron(schedule, relative);
    if (!at) break;
    rows.push({ fire, at: at.toISOString() });
    relative = at.getTime() + 1;
  }
  if (rows.length === 0) throw new Error(`invalid cron schedule: ${schedule}`);
  logTable(rows, ['fire', 'at']);
}

async function main(): Promise<void> {
  const opts = parseArgv(Bun.argv.slice(2));
  if (!opts) {
    console.log(`Usage: bun tools/partner-finance-report.ts <run|preview|cron-preview|register|remove> [options]
Options: --days <n> · --partner <CODE> · --schedule <cron> · --title <name> · --count <n>`);
    process.exit(2);
  }

  switch (opts.command) {
    case 'preview':
      await preview(opts);
      return;
    case 'cron-preview':
      previewCron(opts.schedule, opts.count);
      return;
    case 'register':
      await registerOsCron(FINANCE_REPORT_WORKER, opts.schedule, opts.title);
      console.log(
        colorize(
          `registered "${opts.title}" · schedule ${opts.schedule} (system local) · worker ${FINANCE_REPORT_WORKER}`,
          '#3fb950'
        )
      );
      return;
    case 'remove':
      await removeOsCron(opts.title);
      console.log(colorize(`removed "${opts.title}"`, '#3fb950'));
      return;
    case 'run': {
      let result: Awaited<ReturnType<typeof runDailyFinanceReport>>;
      try {
        result = await runDailyFinanceReport({
          days: opts.days,
          ...(opts.partnerCode ? { partnerCode: opts.partnerCode } : {}),
        });
      } catch (err) {
        console.error(
          colorize(
            `partner:finance-report · ${err instanceof Error ? err.message : err}`,
            '#f85149'
          )
        );
        process.exitCode = 1;
        return;
      }
      logTable(
        [
          {
            partners: result.partners,
            sent: result.sent,
            skipped: result.skipped.length,
            failed: result.failed.length,
          },
        ],
        ['partners', 'sent', 'skipped', 'failed']
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

#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
// @see https://bun.com/docs/runtime/cron#bun-cron-remove
// @see https://bun.com/docs/runtime/cron#bun-cron-parse
/**
 * OS-level daily cron for telegram catalog research (Reasonix / launchd primary).
 *
 *   bun run telegram:catalog:research:cron:register
 *   bun run telegram:catalog:research:cron:preview
 *   bun run telegram:catalog:research:cron:remove
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { joinPath } from '../lib/path-bun.ts';
import { registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import {
  resolveCatalogResearchCronSchedule,
  resolveCatalogResearchCronTitle,
  TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE,
  TELEGRAM_CATALOG_RESEARCH_CRON_TITLE,
} from '../lib/telegram/catalog-research/constants.ts';

const ROOT = joinPath(import.meta.dir, '..');
export const TELEGRAM_CATALOG_RESEARCH_CRON_WORKER = joinPath(
  ROOT,
  'lib/telegram/catalog-research/cron-worker.ts'
);

type Command = 'register' | 'remove' | 'preview';

function previewFireTimes(expression: string, count: number, from?: Date | number): Date[] {
  const out: Date[] = [];
  let cursor: Date | number = from ?? Date.now();
  for (let i = 0; i < count; i++) {
    const next = Bun.cron.parse(expression, cursor);
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

  let schedule = resolveCatalogResearchCronSchedule();
  let title = resolveCatalogResearchCronTitle();
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

const opts = parseArgv(
  applyUnknownLongOptionGuardFor('telegram:catalog:research:cron:preview', Bun.argv.slice(2))
);
if (!opts) {
  console.log(`Usage: bun tools/telegram-catalog-research-cron.ts <register|remove|preview> [options]

Daily OS Bun.cron for: bun run telegram:catalog:research

Options:
  --schedule <expr>   Default: ${TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE} (system local time)
  --title <id>        Default: ${TELEGRAM_CATALOG_RESEARCH_CRON_TITLE}
  --count <n>         Preview fires (default 3)

Env:
  TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE
  TELEGRAM_CATALOG_RESEARCH_CRON_TITLE

Worker: ${TELEGRAM_CATALOG_RESEARCH_CRON_WORKER}
Logs (macOS): /tmp/bun.cron.${TELEGRAM_CATALOG_RESEARCH_CRON_TITLE}.stdout.log
`);
  process.exit(1);
}

switch (opts.command) {
  case 'register': {
    await registerOsCron(TELEGRAM_CATALOG_RESEARCH_CRON_WORKER, opts.schedule, opts.title);
    console.log(`Registered OS cron "${opts.title}"`);
    console.log(`  worker: ${TELEGRAM_CATALOG_RESEARCH_CRON_WORKER}`);
    console.log(`  schedule: ${opts.schedule} (system local time)`);
    console.log(`  runs: bun run telegram:catalog:research (via scheduled worker)`);
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
    if (!times.length) {
      console.error(`No upcoming fires for: ${opts.schedule}`);
      process.exit(1);
    }
    console.log(`Schedule: ${opts.schedule}`);
    console.log(`Title: ${opts.title}`);
    console.log(`System TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(
      `OS cron fires in system local time. Override worker TZ: TELEGRAM_CATALOG_RESEARCH_TZ`
    );
    console.log(
      `Next ${times.length} fire(s) (UTC via Bun.cron.parse — not necessarily local wall clock):`
    );
    for (const [i, d] of times.entries()) {
      console.log(`  ${i + 1}. ${d.toISOString()}`);
    }
    break;
  }
}

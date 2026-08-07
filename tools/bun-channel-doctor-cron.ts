#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
// @see https://bun.com/docs/runtime/cron#bun-cron-remove
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Register, inspect, or remove the OS-persistent Bun channel doctor. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  loadBunChannelConfig,
  type BunChannelConfig,
} from '../lib/verification/bun-channel-doctor.ts';

export const BUN_CHANNEL_DOCTOR_CRON_WORKER = joinPath(
  import.meta.dir,
  'bun-channel-doctor-worker.ts'
);

export type BunChannelCronCommand = 'register' | 'remove' | 'preview';

export type BunChannelCronArgs = {
  command: BunChannelCronCommand;
  root: string;
  schedule?: string;
  title?: string;
  count: number;
};

export type BunChannelCronDependencies = {
  loadConfig: (root?: string) => Promise<BunChannelConfig>;
  register: (path: string, schedule: string, title: string) => Promise<void>;
  remove: (title: string) => Promise<void>;
};

export type BunChannelCronResult = {
  command: BunChannelCronCommand;
  worker: string;
  schedule: string;
  title: string;
  osTimezone: 'system';
  previewUtc: string[];
};

const DEFAULT_ROOT = joinPath(import.meta.dir, '..');

const DEFAULT_DEPENDENCIES: BunChannelCronDependencies = {
  loadConfig: loadBunChannelConfig,
  register: registerOsCron,
  remove: removeOsCron,
};

export function parseBunChannelCronArgs(argv: string[]): BunChannelCronArgs | null {
  const command = argv.find(value => !value.startsWith('-')) as BunChannelCronCommand | undefined;
  if (!command || !['register', 'remove', 'preview'].includes(command)) return null;

  let root = DEFAULT_ROOT;
  let schedule: string | undefined;
  let title: string | undefined;
  let count = 3;

  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]!;
    if (value === '--root' && argv[index + 1]) root = argv[++index]!;
    else if (value.startsWith('--root=')) root = value.slice('--root='.length);
    else if (value === '--schedule' && argv[index + 1]) schedule = argv[++index]!;
    else if (value.startsWith('--schedule=')) schedule = value.slice('--schedule='.length);
    else if (value === '--title' && argv[index + 1]) title = argv[++index]!;
    else if (value.startsWith('--title=')) title = value.slice('--title='.length);
    else if (value === '--count' && argv[index + 1]) {
      count = Number.parseInt(argv[++index]!, 10);
    } else if (value.startsWith('--count=')) {
      count = Number.parseInt(value.slice('--count='.length), 10);
    }
  }

  return {
    command,
    root,
    schedule,
    title,
    count: Number.isFinite(count) ? Math.max(1, count) : 3,
  };
}

export function previewBunChannelSchedule(
  expression: string,
  count: number,
  from: Date | number = Date.now()
): Date[] {
  const times: Date[] = [];
  let cursor: Date | number = from;
  for (let index = 0; index < count; index++) {
    const next = parseCron(expression, cursor);
    if (!next) break;
    times.push(next);
    cursor = next.getTime() + 1;
  }
  return times;
}

export async function executeBunChannelCronCommand(
  args: BunChannelCronArgs,
  dependencies: BunChannelCronDependencies = DEFAULT_DEPENDENCIES
): Promise<BunChannelCronResult> {
  const config = await dependencies.loadConfig(args.root);
  const schedule = args.schedule ?? config.monitor.os_schedule;
  const title = args.title ?? config.monitor.title;
  const previewUtc = previewBunChannelSchedule(schedule, args.count).map(date =>
    date.toISOString()
  );

  if (args.command === 'register') {
    await dependencies.register(BUN_CHANNEL_DOCTOR_CRON_WORKER, schedule, title);
  } else if (args.command === 'remove') {
    await dependencies.remove(title);
  }

  return {
    command: args.command,
    worker: BUN_CHANNEL_DOCTOR_CRON_WORKER,
    schedule,
    title,
    osTimezone: config.monitor.os_timezone,
    previewUtc,
  };
}

function printUsage(): void {
  console.log(`Usage: bun tools/bun-channel-doctor-cron.ts <register|remove|preview> [options]

Options:
  --root <path>       Repository root containing config/bun-channels.toml
  --schedule <expr>   Override monitor.os_schedule
  --title <id>        Override monitor.title
  --count <n>         UTC expression previews (default 3)

Registration uses the OS scheduler and therefore system local time. On pinned
Bun 1.3, Bun.cron.parse previews UTC; they validate the expression but are not
an exact wall-clock preview when the machine timezone is not UTC.
`);
}

async function main(): Promise<void> {
  const args = parseBunChannelCronArgs(
    applyUnknownLongOptionGuardFor('bun:channel:cron:preview', Bun.argv.slice(2))
  );
  if (!args) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const result = await executeBunChannelCronCommand(args);
  if (result.command === 'register') {
    console.log(`Registered OS cron "${result.title}"`);
    console.log(`  worker: ${result.worker}`);
    console.log(`  schedule: ${result.schedule} (system local time)`);
  } else if (result.command === 'remove') {
    console.log(`Removed OS cron "${result.title}" (if present)`);
  } else {
    console.log(`Schedule: ${result.schedule} (OS system local time)`);
    console.log('UTC expression references from Bun.cron.parse:');
    for (const time of result.previewUtc) console.log(`  ${time}`);
  }
}

if (isModuleEntrypoint(import.meta)) await main();

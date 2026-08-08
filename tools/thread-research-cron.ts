#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
// @see https://bun.com/docs/runtime/cron#bun-cron-remove
import { applyUnknownLongOptionGuard } from '../lib/docs/ref-id-tool-flags.ts';
import { parseCron, registerOsCron, removeOsCron } from '../lib/harness/cron.ts';
import { joinPath } from '../lib/path-bun.ts';

export const THREAD_RESEARCH_CRON_SCHEDULE = '15 6 * * *';
export const THREAD_RESEARCH_CRON_TITLE = 'project-r-thread-research';
export const THREAD_RESEARCH_CRON_WORKER = joinPath(
  import.meta.dir,
  'thread-research-cron-worker.ts'
);

type Command = 'preview' | 'register' | 'remove';
const argv = applyUnknownLongOptionGuard(Bun.argv.slice(2), ['schedule'], {
  cliName: 'threads:research:cron',
});
const command = argv.find(value => !value.startsWith('-')) as Command | undefined;
let schedule = THREAD_RESEARCH_CRON_SCHEDULE;
for (let index = 0; index < argv.length; index++) {
  if (argv[index] === '--schedule' && argv[index + 1]) schedule = argv[++index]!;
  else if (argv[index]!.startsWith('--schedule=')) schedule = argv[index]!.slice(11);
}

if (!command || !['preview', 'register', 'remove'].includes(command)) {
  console.info(`Usage: bun tools/thread-research-cron.ts <preview|register|remove> [--schedule <expr>]

Daily OS-level Bun.cron for three ephemeral, read-only thread research agents.
Default: ${THREAD_RESEARCH_CRON_SCHEDULE} system local time
Worker: ${THREAD_RESEARCH_CRON_WORKER}`);
  process.exitCode = 1;
} else if (command === 'register') {
  await registerOsCron(THREAD_RESEARCH_CRON_WORKER, schedule, THREAD_RESEARCH_CRON_TITLE);
  console.info(
    `Registered OS cron "${THREAD_RESEARCH_CRON_TITLE}" @ ${schedule} system local time`
  );
} else if (command === 'remove') {
  await removeOsCron(THREAD_RESEARCH_CRON_TITLE);
  console.info(`Removed OS cron "${THREAD_RESEARCH_CRON_TITLE}" (if present)`);
} else {
  console.info(`Schedule: ${schedule} (system local time)`);
  let cursor: Date | number = Date.now();
  for (let index = 0; index < 3; index++) {
    const next = parseCron(schedule, cursor);
    if (!next) break;
    console.info(`  ${next.toISOString()} (UTC expression reference)`);
    cursor = next.getTime() + 1;
  }
}

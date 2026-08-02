#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
/**
 * domain-sweep-cron.ts — in-process Bun.cron loop for the domain sweep.
 *
 *   bun run sweep:domain:cron              # every 15 min (default)
 *   bun tools/domain-sweep-cron.ts '0/5 * * * *'   # custom expression (UTC)
 *
 * Runs `bun tools/domain-sweep.ts --fast` every interval plus the full gate
 * suite every 4th tick (hourly). No-overlap: a tick that finds the previous
 * run still active is skipped. Reports append to reports/domain-sweep.jsonl
 * (gitignored); failures print to stderr for the supervising pane.
 *
 * In-process complement of the OS-persistent path (lib/harness/cron.ts;
 * docs/harness/cron.md) — the daemon's lifetime is owned by this process.
 */

import { scheduleInProcess, parseCron } from '../lib/harness/cron.ts';
import { bunSpawnArgs } from '../lib/bun-executable.ts';

export {};

const EXPR = Bun.argv[2] ?? '*/15 * * * *';
const FULL_EVERY = 4; // every 4th tick runs subprocess gates too

let running = false;
let tick = 0;

async function runSweep(full: boolean): Promise<void> {
  const args = full ? [] : ['--fast'];
  const t0 = Bun.nanoseconds();
  const proc = Bun.spawn(bunSpawnArgs(['tools/domain-sweep.ts', ...args]), {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env },
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
  const summary = out.trim().split('\n').filter(Boolean).pop() ?? `exit ${code}`;
  const line = `${new Date().toISOString()} tick=${tick} ${full ? 'full' : 'fast'} exit=${code} ${ms}ms ${summary}`;
  if (code === 0) console.info(line);
  else console.error(`❌ ${line}`);
}

async function fire() {
  if (running) {
    console.error('⏭  sweep tick skipped — previous run still active');
    return;
  }
  running = true;
  tick++;
  try {
    await runSweep(tick % FULL_EVERY === 0);
  } finally {
    running = false;
  }
}

const next = parseCron(EXPR);
console.info(
  `⏰ domain-sweep cron armed: ${EXPR} (UTC) · full gates every ${FULL_EVERY} ticks · next ${next?.toISOString() ?? '?'}`
);
scheduleInProcess(EXPR, fire);
await fire(); // first run immediately

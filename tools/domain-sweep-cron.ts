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
import { captureProcess, summarizeProcessOutput } from '../lib/harness/process-capture.ts';

export const FULL_EVERY = 4; // every 4th tick runs subprocess gates too

export interface SweepCronState {
  running: boolean;
  tick: number;
}

async function runSweep(full: boolean, tick: number): Promise<void> {
  const args = full ? [] : ['--fast'];
  const t0 = Bun.nanoseconds();
  const result = await captureProcess(bunSpawnArgs(['tools/domain-sweep.ts', ...args]), {
    env: { ...Bun.env },
  });
  const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
  const summary = summarizeProcessOutput(result) || `exit ${result.exitCode}`;
  const line = `${new Date().toISOString()} tick=${tick} ${full ? 'full' : 'fast'} exit=${result.exitCode} ${ms}ms ${summary}`;
  if (result.exitCode === 0) console.info(line);
  else console.error(`❌ ${line}`);
}

export async function fireSweep(
  state: SweepCronState,
  sweep: (full: boolean, tick: number) => Promise<void> = runSweep,
  logError: (message: string) => void = console.error
): Promise<void> {
  if (state.running) {
    logError('⏭  sweep tick skipped — previous run still active');
    return;
  }
  state.running = true;
  state.tick++;
  try {
    await sweep(state.tick % FULL_EVERY === 0, state.tick);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logError(`❌ sweep tick ${state.tick} crashed · ${detail}`);
  } finally {
    state.running = false;
  }
}

async function main(): Promise<void> {
  const expression = Bun.argv[2] ?? '*/15 * * * *';
  const state: SweepCronState = { running: false, tick: 0 };
  const next = parseCron(expression);
  console.info(
    `⏰ domain-sweep cron armed: ${expression} (UTC) · full gates every ${FULL_EVERY} ticks · next ${next?.toISOString() ?? '?'}`
  );
  using job = scheduleInProcess(expression, () => fireSweep(state));
  await fireSweep(state); // first run immediately
  await new Promise<void>(() => {}); // the daemon owns the CronJob lifetime
}

if (import.meta.main) await main();

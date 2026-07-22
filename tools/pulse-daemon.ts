#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
/**
 * Rotor pulse — in-process complement daemon for audit catalog integrity.
 *
 * Each fire runs the same checks as `bun run audit:verify` (verifyAuditCatalog).
 * OS-persistent cron is Kalshi-bot research; this is the long-lived verify loop.
 *
 *   bun run pulse:start
 *   bun run pulse:start -- --once
 *   bun run pulse:preview
 */
import { parseCron, scheduleInProcess } from '../lib/harness/cron.ts';
import { joinPath } from '../lib/path-bun.ts';
import { verifyAuditCatalog } from './audit-catalog.ts';

export const DEFAULT_ROTOR_PULSE_CRON = '0 */6 * * *';

const REPO_ROOT = joinPath(import.meta.dir, '..');

export const PULSE_LOG_PATH =
  typeof Bun.env.ROTOR_PULSE_LOG === 'string' && Bun.env.ROTOR_PULSE_LOG.trim() !== ''
    ? Bun.env.ROTOR_PULSE_LOG.trim()
    : joinPath(REPO_ROOT, 'pulse.log');

export type PulseTickResult = Awaited<ReturnType<typeof verifyAuditCatalog>>;

export function resolvePulseSchedule(): string {
  const raw = Bun.env.ROTOR_PULSE_CRON?.trim();
  return raw || DEFAULT_ROTOR_PULSE_CRON;
}

export function previewPulseFires(expression: string, count: number, from?: Date | number): Date[] {
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

export async function appendPulseLog(entry: Record<string, unknown>): Promise<void> {
  await Bun.write(PULSE_LOG_PATH, `${JSON.stringify(entry)}\n`, { append: true });
}

/** Single integrity pass — SSOT for scheduled and --once runs. */
export async function runPulseTick(): Promise<PulseTickResult> {
  const started = Date.now();
  const result = await verifyAuditCatalog();
  const elapsedMs = Date.now() - started;

  const record = {
    ts: new Date().toISOString(),
    ok: result.ok,
    findings: result.count,
    concepts: result.conceptCount,
    errorCount: result.errors.length,
    errors: result.errors,
    elapsedMs,
  };

  if (result.ok) {
    console.log(
      `[pulse] ok — ${result.count} findings, ${result.conceptCount} concepts, ${elapsedMs}ms`
    );
  } else {
    console.error(`[pulse] verify failed (${result.errors.length}):`);
    for (const err of result.errors) console.error(`  ${err}`);
  }

  await appendPulseLog(record);
  return result;
}

export async function runPulseOnce(): Promise<number> {
  const result = await runPulseTick();
  return result.ok ? 0 : 1;
}

export async function runPulseDaemon(schedule: string): Promise<number> {
  process.on('unhandledRejection', err => {
    console.error('[pulse] unhandled rejection:', err);
  });

  console.info(`[pulse] starting integrity daemon (schedule: ${schedule}, UTC)`);
  console.info(`[pulse] log: ${PULSE_LOG_PATH}`);

  using _job = scheduleInProcess(schedule, async () => {
    console.error(`[pulse] fire @ ${new Date().toISOString()}`);
    try {
      await runPulseTick();
    } catch (err) {
      console.error('[pulse] tick error:', err);
    }
  });

  await runPulseTick();

  await new Promise<void>(resolve => {
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });

  console.info('[pulse] shutting down…');
  return 0;
}

function printPreview(schedule: string, count: number): number {
  const times = previewPulseFires(schedule, count);
  if (!times.length) {
    console.error(`[pulse] no upcoming fires for: ${schedule}`);
    return 1;
  }
  console.log(`Schedule: ${schedule} (UTC, in-process)`);
  console.log(`Log: ${PULSE_LOG_PATH}`);
  console.log(`Next ${times.length} fire(s):`);
  for (const [i, d] of times.entries()) {
    console.log(`  ${i + 1}. ${d.toISOString()}`);
  }
  return 0;
}

if (import.meta.main) {
  const argv = Bun.argv.slice(2);
  if (argv[0] === 'preview') {
    const countRaw = Number(Bun.env.ROTOR_PULSE_PREVIEW_COUNT ?? '3');
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 3;
    process.exit(printPreview(resolvePulseSchedule(), count));
  }

  const schedule = resolvePulseSchedule();
  if (argv.includes('--once')) {
    process.exit(await runPulseOnce());
  }

  process.exit(await runPulseDaemon(schedule));
}

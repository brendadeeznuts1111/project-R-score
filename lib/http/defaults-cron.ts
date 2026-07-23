// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-persistent primary
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * In-process Bun.cron for nightly Bun defaults verification.
 *
 * Docs shape (in-process complement — UTC, no-overlap):
 * ```ts
 * Bun.cron("0 4 * * *", async () => {
 *   await runDefaultsVerification();
 * });
 * ```
 *
 * Note: `Bun.cron(title, schedule, handler)` is not a valid overload.
 * - In-process: `Bun.cron(schedule, handler)` → CronJob
 * - OS-level:   `await Bun.cron(path, schedule, title)` with default export scheduled()
 *
 *   bun lib/http/defaults-cron.ts --once
 *   BUN_DEFAULTS_CRON=1 bun lib/http/defaults-cron.ts          # daemon
 *   BUN_DEFAULTS_CRON=1 bun scripts/serve-public.ts            # with portal
 *
 * Schedule default: 04:00 UTC daily (`0 4 * * *`).
 * Override: BUN_DEFAULTS_CRON_SCHEDULE="30 5 * * *"
 */
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { scheduleInProcess, type InProcessCronJob } from '../harness/cron.ts';
import { buildBunDefaultsProof, type BunDefaultsProof } from './bun-defaults-proof.ts';

/** UTC — 04:00 daily (in-process; OS Bun.cron uses local time). */
export const BUN_DEFAULTS_CRON_SCHEDULE =
  (Bun.env.BUN_DEFAULTS_CRON_SCHEDULE || '0 4 * * *').trim() || '0 4 * * *';

export const BUN_DEFAULTS_CRON_TITLE = 'defaults-verify';

/** Default proof artifact path (registry-visible). */
export const BUN_DEFAULTS_PROOF_PATH =
  (Bun.env.BUN_DEFAULTS_PROOF_PATH || 'public/registry/bun-defaults-proof.json').trim() ||
  'public/registry/bun-defaults-proof.json';

export type DefaultsVerificationResult = {
  code: number;
  proof?: BunDefaultsProof;
  path?: string;
  error?: string;
};

/**
 * One tick: run 12 default cases, write proof JSON, return exit-style code.
 */
export async function runDefaultsVerification(opts: {
  savePath?: string;
  quiet?: boolean;
} = {}): Promise<DefaultsVerificationResult> {
  const savePath = opts.savePath ?? BUN_DEFAULTS_PROOF_PATH;
  try {
    const proof = await buildBunDefaultsProof();
    await mkdir(dirname(savePath), { recursive: true });
    await Bun.write(savePath, JSON.stringify(proof, null, 2) + '\n');

    if (!opts.quiet) {
      const s = proof.summary;
      console.info(
        `[${BUN_DEFAULTS_CRON_TITLE}] ${s.passed}/${s.total} pass · hash=${proof.proofHash.slice(0, 16)}… → ${savePath}`
      );
      if (s.failed > 0) {
        for (const c of proof.cases.filter(x => !x.pass)) {
          console.warn(`  FAIL ${c.name}: ${c.error ?? c.actual}`);
        }
      }
    }

    return {
      code: proof.summary.failed > 0 ? 1 : 0,
      proof,
      path: savePath,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[${BUN_DEFAULTS_CRON_TITLE}] cycle failed:`, error);
    return { code: 1, error };
  }
}

export type DefaultsCronScheduler = (
  schedule: string,
  handler: () => void | Promise<void>
) => InProcessCronJob | unknown;

/**
 * Register in-process cron (no-overlap, UTC). Injectable for tests.
 *
 * Equivalent intent to:
 *   Bun.cron("0 4 * * *", () => runDefaultsVerification())
 * with title `defaults-verify` for logs only (in-process has no title arg).
 */
export function registerDefaultsVerifyCron(
  scheduler: DefaultsCronScheduler = scheduleInProcess
): InProcessCronJob | unknown {
  return scheduler(BUN_DEFAULTS_CRON_SCHEDULE, async () => {
    try {
      await runDefaultsVerification();
    } catch (e) {
      // Catch so unhandledRejection does not kill serve-public / daemon
      console.error(`[${BUN_DEFAULTS_CRON_TITLE}] unhandled in tick:`, e);
    }
  });
}

if (import.meta.main) {
  process.on('unhandledRejection', err => {
    console.error(`[${BUN_DEFAULTS_CRON_TITLE}] unhandledRejection:`, err);
  });

  if (Bun.argv.includes('--once')) {
    const { code } = await runDefaultsVerification();
    process.exit(code);
  }

  const job = registerDefaultsVerifyCron();
  console.info(
    `⏰ ${BUN_DEFAULTS_CRON_TITLE} · in-process Bun.cron @ "${BUN_DEFAULTS_CRON_SCHEDULE}" (UTC, no-overlap)`
  );
  console.info(`   writes ${BUN_DEFAULTS_PROOF_PATH} · SIGINT/SIGTERM to stop`);

  await new Promise<void>(resolve => {
    const stop = () => {
      try {
        const j = job as { stop?: () => void };
        j.stop?.();
      } catch {
        /* ignore */
      }
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  console.info(`👋 ${BUN_DEFAULTS_CRON_TITLE} stopped`);
}

#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/api/sqlite — bun:sqlite Database
/**
 * Operator refresh for the partners dashboard single-artifact bake.
 *
 * Ordered steps (each optional via flags):
 *   1. Telegram handshake re-export **with** bot token (membership / operator_ready)
 *   2. partner-profile bake + coverage bake (required profiles clock)
 *   3. partners-dashboard bake (`--as-of max-input` by default)
 *
 * Avoids the regression class where fixture clocks are clustered by rewriting
 * handshake JSON without a token (house_only membership → false handshake_gap).
 *
 * Flags:
 *   --skip-handshake   do not re-export telegram-handshake
 *   --skip-profiles    do not re-bake profiles / coverage
 *   --skip-dashboard   stop after inputs (no partners-dashboard write)
 *   --align-clocks     set generatedAt on optional connector inputs to the
 *                      freshest of profiles/handshake (offline fixture coherence)
 *   --as-of <mode>     max-input (default) | now | ISO — passed to dashboard bake
 *   --dry-run          plan steps only; no writes
 *   --json             machine summary
 *   --check            fail if dashboard bake --check would fail (no full refresh)
 *
 * @see docs/design/partner-dashboard-squad.md residual / hygiene
 */
import { Database } from 'bun:sqlite';
import { jsonOut } from '../lib/console-depth.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import {
  exportTelegramHandshakeCatalog,
  exportTelegramHandshakeSnapshot,
} from '../lib/telegram/handshake-snapshot.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { PARTNER_DASHBOARD_ARTIFACT_REF } from '../packages/partners/src/index.ts';

const TOOL_ID = 'partner:dashboard:refresh' as const;

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor(TOOL_ID, Bun.argv.slice(2))
  : Bun.argv.slice(2);

const DASHBOARD_PATH = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;

const CONNECTOR_CLOCK_PATHS = [
  'public/registry/partner-ledger.json',
  'public/registry/limit-raises.json',
  'public/registry/bookmakers.json',
  'public/registry/tennis/partner-contracts.json',
  'public/registry/sports-terminal/partner-integration-health.json',
] as const;

function hasFlag(name: string): boolean {
  return argv.includes(name);
}

function flagValue(name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new TypeError(`${name} requires a value`);
  }
  return next;
}

async function runCapture(
  cmd: string[],
  dryRun: boolean
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  if (dryRun) {
    return { ok: true, stdout: `[dry-run] ${cmd.join(' ')}`, stderr: '', exitCode: 0 };
  }
  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    env: Bun.env,
    cwd: process.cwd(),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { ok: exitCode === 0, stdout, stderr, exitCode };
}

async function stampGeneratedAt(path: string, iso: string, dryRun: boolean): Promise<void> {
  const file = Bun.file(path);
  if (!(await file.exists())) return;
  if (dryRun) return;
  const raw = (await file.json()) as Record<string, unknown>;
  raw.generatedAt = iso;
  await Bun.write(path, `${JSON.stringify(raw, null, 2)}\n`);
}

async function alignConnectorClocks(clusterIso: string, dryRun: boolean): Promise<string[]> {
  const touched: string[] = [];
  for (const path of CONNECTOR_CLOCK_PATHS) {
    const file = Bun.file(path);
    if (!(await file.exists())) continue;
    await stampGeneratedAt(path, clusterIso, dryRun);
    touched.push(path);
  }
  return touched;
}

export type RefreshStepId = 'handshake' | 'profiles' | 'coverage' | 'align-clocks' | 'dashboard';

export type RefreshPartnersDashboardResult = {
  ok: boolean;
  steps: Array<{
    id: RefreshStepId; // brand-ok — refresh step name enum, not a domain entity id
    ok: boolean;
    detail: string;
  }>;
  handshake?: {
    operatorReady: number;
    blocked: number;
    partners: number;
    generatedAt: string;
  };
  dashboardPath: string;
};

export async function refreshPartnersDashboard(options?: {
  skipHandshake?: boolean;
  skipProfiles?: boolean;
  skipDashboard?: boolean;
  alignClocks?: boolean;
  asOf?: string;
  dryRun?: boolean;
  opsDbPath?: string;
}): Promise<RefreshPartnersDashboardResult> {
  const dryRun = options?.dryRun === true;
  const steps: RefreshPartnersDashboardResult['steps'] = [];
  let handshakeMeta: RefreshPartnersDashboardResult['handshake'];

  // ── 1. Handshake (token required for honest membership) ─────────────────
  if (!options?.skipHandshake) {
    try {
      await loadReasonixEnv();
      const tg = loadTelegramEnv();
      if (!tg.effectiveToken) {
        steps.push({
          id: 'handshake',
          ok: false,
          detail:
            'TELEGRAM bot token missing — export would stamp house_only membership; set token or pass --skip-handshake',
        });
      } else if (dryRun) {
        steps.push({
          id: 'handshake',
          ok: true,
          detail: 'dry-run: would exportTelegramHandshakeSnapshot with token',
        });
      } else {
        const dbPath = options?.opsDbPath ?? (Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH);
        const db = new Database(dbPath, { readonly: true });
        try {
          const slice = await exportTelegramHandshakeSnapshot(db, process.cwd(), {
            telegramToken: tg.effectiveToken,
          });
          await exportTelegramHandshakeCatalog(process.cwd());
          handshakeMeta = {
            operatorReady: slice.operatorReady,
            blocked: slice.blocked,
            partners: slice.partners,
            generatedAt: slice.generatedAt,
          };
          steps.push({
            id: 'handshake',
            ok: true,
            detail: `operatorReady=${slice.operatorReady} blocked=${slice.blocked} partners=${slice.partners} at ${slice.generatedAt}`,
          });
        } finally {
          db.close();
        }
      }
    } catch (err) {
      steps.push({
        id: 'handshake',
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    steps.push({ id: 'handshake', ok: true, detail: 'skipped' });
  }

  // ── 2. Profiles + coverage ───────────────────────────────────────────────
  if (!options?.skipProfiles) {
    const profileBake = await runCapture(['bun', 'run', 'partner-profile:bake'], dryRun);
    steps.push({
      id: 'profiles',
      ok: profileBake.ok,
      detail: profileBake.ok
        ? (profileBake.stdout.trim().split('\n').pop() ?? 'ok')
        : profileBake.stderr.trim() || profileBake.stdout.trim(),
    });
    if (profileBake.ok) {
      const coverageBake = await runCapture(
        ['bun', 'run', 'partner-profile:coverage:bake'],
        dryRun
      );
      steps.push({
        id: 'coverage',
        ok: coverageBake.ok,
        detail: coverageBake.ok
          ? (coverageBake.stdout.trim().split('\n').pop() ?? 'ok')
          : coverageBake.stderr.trim() || coverageBake.stdout.trim(),
      });
    } else {
      steps.push({ id: 'coverage', ok: false, detail: 'skipped (profiles failed)' });
    }
  } else {
    steps.push({ id: 'profiles', ok: true, detail: 'skipped' });
    steps.push({ id: 'coverage', ok: true, detail: 'skipped' });
  }

  // ── 3. Optional clock align ──────────────────────────────────────────────
  if (options?.alignClocks) {
    try {
      const profileGen = dryRun
        ? new Date().toISOString()
        : (
            (await Bun.file('public/registry/partner-profiles.json').json()) as {
              generatedAt?: string;
            }
          ).generatedAt;
      const handGen = dryRun
        ? profileGen
        : (
            (await Bun.file('public/registry/telegram-handshake.json').json()) as {
              generatedAt?: string;
            }
          ).generatedAt;
      const cluster =
        profileGen && handGen
          ? profileGen > handGen
            ? profileGen
            : handGen
          : (profileGen ?? handGen ?? new Date().toISOString());
      if (!dryRun && profileGen && profileGen !== cluster) {
        await stampGeneratedAt('public/registry/partner-profiles.json', cluster, dryRun);
        await stampGeneratedAt('public/registry/partner-profile-coverage.json', cluster, dryRun);
      }
      if (!dryRun && handGen && handGen !== cluster) {
        await stampGeneratedAt('public/registry/telegram-handshake.json', cluster, dryRun);
      }
      const touched = await alignConnectorClocks(cluster, dryRun);
      steps.push({
        id: 'align-clocks',
        ok: true,
        detail: `cluster=${cluster} · ${touched.length} optional inputs stamped`,
      });
    } catch (err) {
      steps.push({
        id: 'align-clocks',
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 4. Dashboard bake ────────────────────────────────────────────────────
  if (!options?.skipDashboard) {
    const asOf = options?.asOf ?? 'max-input';
    // Invoke the script directly so --as-of is a Bun argv flag (not swallowed by package.json).
    const finalBake = await runCapture(
      ['bun', 'scripts/bake-partners-dashboard.ts', '--as-of', asOf],
      dryRun
    );
    steps.push({
      id: 'dashboard',
      ok: finalBake.ok,
      detail: finalBake.ok
        ? finalBake.stdout.trim().split('\n').filter(Boolean).slice(-2).join(' · ') || 'ok'
        : finalBake.stderr.trim() || finalBake.stdout.trim(),
    });
  } else {
    steps.push({ id: 'dashboard', ok: true, detail: 'skipped' });
  }

  const ok = steps.every(s => s.ok);
  return {
    ok,
    steps,
    ...(handshakeMeta ? { handshake: handshakeMeta } : {}),
    dashboardPath: DASHBOARD_PATH,
  };
}

async function main(): Promise<void> {
  if (hasFlag('--check')) {
    const check = await runCapture(['bun', 'scripts/bake-partners-dashboard.ts', '--check'], false);
    if (!check.ok) {
      console.error(check.stderr || check.stdout);
      process.exit(check.exitCode || 1);
    }
    if (hasFlag('--json')) {
      jsonOut({ ok: true, check: true, detail: check.stdout.trim() });
    } else {
      console.log(check.stdout.trim());
    }
    return;
  }

  const result = await refreshPartnersDashboard({
    skipHandshake: hasFlag('--skip-handshake'),
    skipProfiles: hasFlag('--skip-profiles'),
    skipDashboard: hasFlag('--skip-dashboard'),
    alignClocks: hasFlag('--align-clocks'),
    asOf: flagValue('--as-of') ?? 'max-input',
    dryRun: hasFlag('--dry-run'),
  });

  if (hasFlag('--json')) {
    jsonOut(result);
  } else {
    console.log(`partner:dashboard:refresh ${result.ok ? 'ok' : 'FAILED'}`);
    for (const step of result.steps) {
      console.log(`  ${step.ok ? '✓' : '✗'} ${step.id}: ${step.detail}`);
    }
    if (result.handshake) {
      console.log(
        `  handshake: ${result.handshake.operatorReady}/${result.handshake.partners} operator_ready · blocked=${result.handshake.blocked}`
      );
    }
  }

  if (!result.ok) process.exit(1);
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

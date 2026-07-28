// @see https://bun.com/docs/pm/isolated-installs — configVersion + linker defaults
// @see https://bun.com/docs/pm/cli/install#default-strategy — lockfile configVersion
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect-table — Bun.inspect.table
/**
 * portal-cli doctor — unified offline health gate for portal control plane.
 *
 * Fast pure checks by default (no network). Linker policy is mandatory:
 *   bun.lock configVersion must be 1 for this workspace monorepo.
 *
 *   portal-cli doctor
 *   portal-cli doctor --json
 *   portal-cli doctor --verbose   # fix command · impact · auto-fixable · env scope
 *   portal-cli doctor --full     # also spawns vault/capabilities/install gates
 *
 * Fix commands use real monorepo scripts only (no invented Bun flags).
 *
 * @see lib/docs/bun-install-linker-docs.ts
 * @see scripts/verify-install-cache.ts (install:verify)
 */

import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  INSTALL_LINKER_DOCS,
  probeLockfileConfigVersion,
} from '../../lib/docs/bun-install-linker-docs.ts';
import {
  readMachineBunfig,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
} from '../../scripts/lib/machine-bunfig.ts';

export type PortalDoctorLevel = 'fatal' | 'warn' | 'info';
export type PortalDoctorEnvScope = 'dev' | 'ci' | 'all';

export type PortalDoctorCheck = {
  id: string; // brand-ok — check id enum-like opaque key (linker-config-version, …)
  level: PortalDoctorLevel;
  ok: boolean;
  message: string;
  /** Canonical doc URL when known. */
  source?: string;
  /** Real monorepo command to remediate (never invented Bun flags). */
  fixCommand?: string;
  /** Why this check matters. */
  impact?: string;
  /** Whether a bake/script can restore without manual vault/config surgery. */
  autoFixable?: boolean;
  /** Rough human effort when not auto. */
  timeToFix?: string;
  /** Where the check applies. */
  envScope?: PortalDoctorEnvScope;
};

export type PortalDoctorSummary = {
  fatal: number;
  warn: number;
  info: number;
  failed: number;
  autoFixableFailed: number;
  suggested: string[];
};

export type PortalDoctorReport = {
  kind: 'portal-cli-doctor';
  schemaVersion: 2;
  ok: boolean;
  full: boolean;
  verbose: boolean;
  generatedAt: string;
  checks: PortalDoctorCheck[];
  summary: PortalDoctorSummary;
  docs: {
    isolatedInstalls: string;
    defaultStrategy: string;
  };
};

export type PortalDoctorOpts = {
  cwd?: string;
  full?: boolean;
  verbose?: boolean;
  /** Inject spawn for tests */
  spawn?: (argv: string[], opts?: { cwd?: string }) => Promise<number>;
};

async function defaultSpawn(argv: string[], opts?: { cwd?: string }): Promise<number> {
  const proc = Bun.spawn(argv, {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  return (await proc.exited) ?? 1;
}

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

function withMeta(
  base: PortalDoctorCheck,
  meta: Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message'>
): PortalDoctorCheck {
  return { ...base, ...meta };
}

/**
 * Linker policy check — text lockfile configVersion must be 1 for monorepo.
 * Uses the same probe as install:verify / install-platform.
 */
export async function checkLinkerConfigVersion(cwd: string): Promise<PortalDoctorCheck> {
  const probe = await probeLockfileConfigVersion(cwd);
  return withMeta(
    {
      id: 'linker-config-version',
      level: 'fatal',
      ok: probe.ok,
      message: probe.note,
      source: INSTALL_LINKER_DOCS.installDefaultStrategy,
    },
    {
      fixCommand: probe.ok
        ? 'bun run install:verify'
        : 'Keep root bun.lock configVersion: 1 (do not downgrade to 0). See docs/UNIFIED.md · bun run portal-cli scanner policy',
      impact:
        'configVersion drives Bun default linker: 1+workspaces → isolated; 0 → hoisted (phantom deps risk)',
      autoFixable: false,
      timeToFix: probe.ok ? '—' : '5–15 min',
      envScope: 'all',
    }
  );
}

export async function checkMachineIsolatedLinker(cwd: string): Promise<PortalDoctorCheck> {
  const eff = resolveEffectiveInstallPolicy(
    await readProjectBunfig(cwd),
    await readMachineBunfig()
  );
  const ok = eff.linker === 'isolated';
  return withMeta(
    {
      id: 'machine-isolated-linker',
      level: 'fatal',
      ok,
      message: ok
        ? `linker=${eff.linker} (source=${eff.source.linker}) · globalStore=${String(eff.globalStore)}`
        : `linker=${eff.linker ?? 'unset'} — monorepo requires isolated (machine ~/.bunfig.toml)`,
      source: INSTALL_LINKER_DOCS.bunfigLinker,
    },
    {
      fixCommand: ok
        ? 'bun run install:verify'
        : 'Set linker = "isolated" (and globalStore = true) in ~/.bunfig.toml — do not put linker in project bunfig.toml',
      impact:
        'Without isolated linker, workspace packages can see undeclared deps (phantom dependencies)',
      autoFixable: false,
      timeToFix: ok ? '—' : '2–5 min',
      envScope: 'all',
    }
  );
}

export function summarizeDoctorChecks(checks: PortalDoctorCheck[]): PortalDoctorSummary {
  let fatal = 0;
  let warn = 0;
  let info = 0;
  let failed = 0;
  let autoFixableFailed = 0;
  const suggested: string[] = [];
  const seen = new Set<string>();

  for (const c of checks) {
    if (c.level === 'fatal') fatal++;
    else if (c.level === 'warn') warn++;
    else info++;
    if (!c.ok) {
      failed++;
      if (c.autoFixable && c.fixCommand) {
        autoFixableFailed++;
        if (!seen.has(c.fixCommand)) {
          seen.add(c.fixCommand);
          suggested.push(c.fixCommand);
        }
      }
    }
  }
  return { fatal, warn, info, failed, autoFixableFailed, suggested };
}

export async function runPortalDoctor(opts: PortalDoctorOpts = {}): Promise<PortalDoctorReport> {
  const cwd = opts.cwd ?? process.cwd();
  const full = Boolean(opts.full);
  const verbose = Boolean(opts.verbose);
  const spawn = opts.spawn ?? defaultSpawn;
  const checks: PortalDoctorCheck[] = [];

  // 1) Linker policy (mandatory, pure)
  checks.push(await checkLinkerConfigVersion(cwd));
  checks.push(await checkMachineIsolatedLinker(cwd));

  // 2) Offline artifact presence (vault / capabilities / bunfig bake)
  const vaultHealth = joinPath(cwd, 'public/registry/vault-health.json');
  const vaultOk = await fileExists(vaultHealth);
  checks.push(
    withMeta(
      {
        id: 'vault-health-bake',
        level: 'warn',
        ok: vaultOk,
        message: vaultOk
          ? 'public/registry/vault-health.json present'
          : 'vault-health bake missing — bun run vault:health:bake (needs pass session)',
      },
      {
        fixCommand: 'bun run vault:health:bake',
        impact: 'Portal /portal/vault/ board and nav badges need the bake artifact',
        autoFixable: true,
        timeToFix: '1–3 min',
        envScope: 'dev',
        source: undefined,
      }
    )
  );

  const capSubset = joinPath(cwd, 'public/registry/capability-map-subset.json');
  const capOk = await fileExists(capSubset);
  checks.push(
    withMeta(
      {
        id: 'capability-map-subset',
        level: 'warn',
        ok: capOk,
        message: capOk
          ? 'public/registry/capability-map-subset.json present'
          : 'capability-map-subset missing — bun run bake:capabilities',
      },
      {
        fixCommand: 'bun run bake:capabilities',
        impact: 'Tools hub capabilities table and doctor/capability gates need the bake',
        autoFixable: true,
        timeToFix: '1 min',
        envScope: 'all',
      }
    )
  );

  const bunfigState = joinPath(cwd, 'public/registry/bunfig-state.json');
  const bunfigOk = await fileExists(bunfigState);
  checks.push(
    withMeta(
      {
        id: 'bunfig-state-bake',
        level: 'info',
        ok: bunfigOk,
        message: bunfigOk
          ? 'public/registry/bunfig-state.json present'
          : 'bunfig-state bake missing — bun run bunfig:bake (optional)',
      },
      {
        fixCommand: 'bun run bunfig:bake',
        impact: 'Offline bunfig provenance board for portal tooling',
        autoFixable: true,
        timeToFix: '1 min',
        envScope: 'dev',
      }
    )
  );

  // 3) Optional full: spawn existing gates (no network assumed)
  if (full) {
    const installVerify = await spawn(['bun', 'run', 'install:verify'], { cwd });
    checks.push(
      withMeta(
        {
          id: 'install-verify',
          level: 'fatal',
          ok: installVerify === 0,
          message:
            installVerify === 0 ? 'bun run install:verify OK' : 'bun run install:verify FAILED',
        },
        {
          fixCommand: 'bun run install:verify',
          impact: 'Machine cache/linker/configVersion gate used by CI and day-loop',
          autoFixable: false,
          timeToFix: '2–10 min',
          envScope: 'ci',
        }
      )
    );

    const vaultGate = await spawn(['bun', 'test', 'tests/vault-health.test.ts'], { cwd });
    checks.push(
      withMeta(
        {
          id: 'vault-health-gate',
          level: 'fatal',
          ok: vaultGate === 0,
          message:
            vaultGate === 0
              ? 'portal-cli vault health (offline snap) OK'
              : 'vault-health tests FAILED',
        },
        {
          fixCommand: 'bun run portal-cli vault health',
          impact: 'Vault-map inventory snapshot gate (CI / Harness Gates)',
          autoFixable: false,
          timeToFix: '2–10 min',
          envScope: 'ci',
        }
      )
    );

    const capGate = await spawn(['bun', 'test', 'tests/capability-map-subset.test.ts'], { cwd });
    checks.push(
      withMeta(
        {
          id: 'capabilities-health-gate',
          level: 'fatal',
          ok: capGate === 0,
          message:
            capGate === 0
              ? 'capabilities health (subset tests) OK'
              : 'capability-map-subset tests FAILED',
        },
        {
          fixCommand: 'bun run bake:capabilities:check',
          impact: 'Grounded capability map bake must match AGENTS.md',
          autoFixable: true,
          timeToFix: '1–2 min',
          envScope: 'ci',
        }
      )
    );
  }

  // Default mode: only fatal failures fail the doctor; warns are advisory
  const ok = checks.filter(c => c.level === 'fatal').every(c => c.ok);
  const summary = summarizeDoctorChecks(checks);

  return {
    kind: 'portal-cli-doctor',
    schemaVersion: 2,
    ok,
    full,
    verbose,
    generatedAt: new Date().toISOString(),
    checks,
    summary,
    docs: {
      isolatedInstalls: INSTALL_LINKER_DOCS.isolatedInstalls,
      defaultStrategy: INSTALL_LINKER_DOCS.installDefaultStrategy,
    },
  };
}

/** Compact default listing (unchanged ergonomics). */
export function formatPortalDoctor(r: PortalDoctorReport): string {
  const lines = [
    `portal doctor  ${r.ok ? 'OK' : 'FAIL'}${r.full ? ' (full)' : ''}${r.verbose ? ' (verbose)' : ''}`,
    '',
  ];
  for (const c of r.checks) {
    const mark = c.ok ? '✓' : c.level === 'info' ? '·' : '✗';
    lines.push(`  ${mark} [${c.level}] ${c.id}: ${c.message}`);
  }
  lines.push('');
  lines.push(formatDoctorSummaryFooter(r.summary));
  lines.push('');
  lines.push(`Isolated installs: ${r.docs.isolatedInstalls}`);
  lines.push(`Default strategy:  ${r.docs.defaultStrategy}`);
  lines.push('');
  lines.push(
    'Related: portal-cli vault health · capabilities health · scanner doctor · bunfig check'
  );
  lines.push(
    '         bun run install:verify · portal-cli doctor --full · portal-cli doctor --verbose'
  );
  return lines.join('\n');
}

export function formatDoctorSummaryFooter(s: PortalDoctorSummary): string {
  const lines = [
    `Summary: ${s.fatal} fatal · ${s.warn} warn · ${s.info} info · ${s.failed} failed · ${s.autoFixableFailed} auto-fixable`,
  ];
  if (s.autoFixableFailed > 0 && s.suggested.length) {
    lines.push('Suggested (auto-fixable):');
    for (const cmd of s.suggested) {
      lines.push(`  ${cmd}`);
    }
  } else if (s.failed > 0) {
    lines.push('Suggested: portal-cli doctor --verbose  # fix commands + impact');
  }
  return lines.join('\n');
}

/**
 * Extended table for --verbose: check · level · what · fix · auto · scope · time.
 * Uses Bun.inspect.table when available for aligned columns.
 */
export function formatPortalDoctorVerbose(r: PortalDoctorReport): string {
  const rows = r.checks.map(c => ({
    check: c.id,
    level: c.level,
    ok: c.ok ? 'yes' : 'NO',
    what: truncate(c.message, 56),
    fix: truncate(c.fixCommand ?? '—', 48),
    auto: c.autoFixable === undefined ? '—' : c.autoFixable ? 'yes' : 'no',
    scope: c.envScope ?? '—',
    time: c.timeToFix ?? '—',
  }));

  const header = [`portal doctor  ${r.ok ? 'OK' : 'FAIL'}${r.full ? ' (full)' : ''} (verbose)`, ''];

  let table: string;
  try {
    // @see https://bun.com/docs/runtime/utils#bun-inspect-table
    table = Bun.inspect.table(rows, {
      columns: ['check', 'level', 'ok', 'what', 'fix', 'auto', 'scope', 'time'],
      colors: false,
    });
  } catch {
    table = rows
      .map(
        row =>
          `${row.ok === 'yes' ? '✓' : '✗'} ${row.check.padEnd(26)} ${row.level.padEnd(6)} ${row.fix}`
      )
      .join('\n');
  }

  const impactLines: string[] = ['', 'Impact / docs (failed or fatal only):'];
  for (const c of r.checks) {
    if (c.ok && c.level !== 'fatal') continue;
    if (c.ok && c.level === 'fatal') {
      // still show fatal successes lightly? skip
      continue;
    }
    impactLines.push(`  · ${c.id}`);
    if (c.impact) impactLines.push(`      impact: ${c.impact}`);
    if (c.fixCommand) impactLines.push(`      fix:    ${c.fixCommand}`);
    if (c.source) impactLines.push(`      doc:    ${c.source}`);
  }
  // Always document linker impact when verbose
  impactLines.push('', 'Linker policy (always):');
  for (const id of ['linker-config-version', 'machine-isolated-linker']) {
    const c = r.checks.find(x => x.id === id);
    if (!c) continue;
    impactLines.push(`  · ${c.id}: ${c.ok ? 'OK' : 'FAIL'}`);
    if (c.impact) impactLines.push(`      impact: ${c.impact}`);
    if (c.fixCommand) impactLines.push(`      fix:    ${c.fixCommand}`);
    if (c.source) impactLines.push(`      doc:    ${c.source}`);
  }

  return [
    ...header,
    table,
    '',
    formatDoctorSummaryFooter(r.summary),
    ...impactLines,
    '',
    `Isolated installs: ${r.docs.isolatedInstalls}`,
    `Default strategy:  ${r.docs.defaultStrategy}`,
  ].join('\n');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

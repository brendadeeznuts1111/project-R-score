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
 *   portal-cli doctor --verbose     # table: fix · auto · scope · time + impact
 *   portal-cli doctor --failed-only # hide passing checks (default + verbose)
 *   portal-cli doctor --full        # spawn install:verify · vault · capability gates
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
export type PortalDoctorGroup = 'linker' | 'bakes' | 'gates';

export type PortalDoctorCheck = {
  id: string; // brand-ok — check id enum-like opaque key (linker-config-version, …)
  level: PortalDoctorLevel;
  ok: boolean;
  message: string;
  group: PortalDoctorGroup;
  /** Canonical doc URL when known. */
  source?: string;
  /** Real monorepo command to remediate when failing (never invented Bun flags). */
  fixCommand?: string;
  /** Why this check matters. */
  impact?: string;
  /** Whether a bake/script can restore without manual vault/config surgery. */
  autoFixable?: boolean;
  /** Rough human effort when failing. */
  timeToFix?: string;
  /** Where the check applies. */
  envScope?: PortalDoctorEnvScope;
  /** Optional freshness note (e.g. bake age). */
  freshness?: string;
};

export type PortalDoctorSummary = {
  checkCount: number;
  passed: number;
  failed: number;
  fatal: number;
  warn: number;
  info: number;
  failedFatal: number;
  failedWarn: number;
  autoFixableFailed: number;
  suggested: string[];
};

export type PortalDoctorReport = {
  kind: 'portal-cli-doctor';
  schemaVersion: 3;
  ok: boolean;
  full: boolean;
  verbose: boolean;
  failedOnly: boolean;
  generatedAt: string;
  checks: PortalDoctorCheck[];
  summary: PortalDoctorSummary;
  docs: {
    isolatedInstalls: string;
    defaultStrategy: string;
    installIsolated: string;
    installHoisted: string;
  };
};

export type PortalDoctorOpts = {
  cwd?: string;
  full?: boolean;
  verbose?: boolean;
  failedOnly?: boolean;
  /** Inject spawn for tests */
  spawn?: (argv: string[], opts?: { cwd?: string }) => Promise<number>;
};

const GROUP_LABEL: Record<PortalDoctorGroup, string> = {
  linker: 'Linker policy',
  bakes: 'Offline bakes',
  gates: 'Spawned gates',
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

/** Read optional ISO generatedAt from a registry bake JSON (no secrets). */
export async function readBakeGeneratedAt(path: string): Promise<string | undefined> {
  try {
    if (!(await Bun.file(path).exists())) return undefined;
    const j = (await Bun.file(path).json()) as { generatedAt?: string };
    return typeof j.generatedAt === 'string' && j.generatedAt ? j.generatedAt : undefined;
  } catch {
    return undefined;
  }
}

/** Human age from ISO timestamp (e.g. "12m ago", "2h ago", "3d ago"). */
export function formatAgeFromIso(iso: string, nowMs: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function withMeta(
  base: PortalDoctorCheck,
  meta: Partial<Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message' | 'group'>>
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
      group: 'linker',
      ok: probe.ok,
      message: probe.note,
      source: INSTALL_LINKER_DOCS.installDefaultStrategy,
    },
    {
      fixCommand: probe.ok
        ? undefined
        : 'Keep root bun.lock "configVersion": 1 (never 0). See docs/UNIFIED.md · portal-cli scanner policy',
      impact:
        'configVersion drives Bun default linker: 1+workspaces → isolated; 0 → hoisted (phantom deps risk)',
      autoFixable: false,
      timeToFix: probe.ok ? undefined : '5–15 min',
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
      group: 'linker',
      ok,
      message: ok
        ? `linker=${eff.linker} (source=${eff.source.linker}) · globalStore=${String(eff.globalStore)}`
        : `linker=${eff.linker ?? 'unset'} — monorepo requires isolated (machine ~/.bunfig.toml)`,
      source: INSTALL_LINKER_DOCS.bunfigLinker,
    },
    {
      fixCommand: ok
        ? undefined
        : 'Set linker = "isolated" and globalStore = true in ~/.bunfig.toml (not project bunfig.toml)',
      impact:
        'Without isolated linker, workspace packages can see undeclared deps (phantom dependencies)',
      autoFixable: false,
      timeToFix: ok ? undefined : '2–5 min',
      envScope: 'all',
    }
  );
}

export function summarizeDoctorChecks(checks: PortalDoctorCheck[]): PortalDoctorSummary {
  let fatal = 0;
  let warn = 0;
  let info = 0;
  let failed = 0;
  let failedFatal = 0;
  let failedWarn = 0;
  let autoFixableFailed = 0;
  let passed = 0;
  const suggested: string[] = [];
  const seen = new Set<string>();

  for (const c of checks) {
    if (c.level === 'fatal') fatal++;
    else if (c.level === 'warn') warn++;
    else info++;
    if (c.ok) {
      passed++;
    } else {
      failed++;
      if (c.level === 'fatal') failedFatal++;
      if (c.level === 'warn') failedWarn++;
      if (c.autoFixable && c.fixCommand) {
        autoFixableFailed++;
        if (!seen.has(c.fixCommand)) {
          seen.add(c.fixCommand);
          suggested.push(c.fixCommand);
        }
      }
    }
  }
  return {
    checkCount: checks.length,
    passed,
    failed,
    fatal,
    warn,
    info,
    failedFatal,
    failedWarn,
    autoFixableFailed,
    suggested,
  };
}

/** Filter checks for display (failed-only keeps failures; always keeps fatals if any fail). */
export function filterDoctorChecks(
  checks: PortalDoctorCheck[],
  failedOnly: boolean
): PortalDoctorCheck[] {
  if (!failedOnly) return checks;
  const failed = checks.filter(c => !c.ok);
  // If everything passed, show nothing extra would be confusing — show linker fatals only
  if (failed.length === 0) return checks.filter(c => c.group === 'linker');
  return failed;
}

export async function runPortalDoctor(opts: PortalDoctorOpts = {}): Promise<PortalDoctorReport> {
  const cwd = opts.cwd ?? process.cwd();
  const full = Boolean(opts.full);
  const verbose = Boolean(opts.verbose);
  const failedOnly = Boolean(opts.failedOnly);
  const spawn = opts.spawn ?? defaultSpawn;
  const checks: PortalDoctorCheck[] = [];

  // 1) Linker policy (mandatory, pure)
  checks.push(await checkLinkerConfigVersion(cwd));
  checks.push(await checkMachineIsolatedLinker(cwd));

  // 2) Offline artifact presence (vault / capabilities / bunfig bake)
  const vaultHealth = joinPath(cwd, 'public/registry/vault-health.json');
  const vaultOk = await fileExists(vaultHealth);
  const vaultAt = vaultOk ? await readBakeGeneratedAt(vaultHealth) : undefined;
  checks.push(
    withMeta(
      {
        id: 'vault-health-bake',
        level: 'warn',
        group: 'bakes',
        ok: vaultOk,
        message: vaultOk
          ? `public/registry/vault-health.json present${vaultAt ? ` · ${formatAgeFromIso(vaultAt)}` : ''}`
          : 'vault-health bake missing — bun run vault:health:bake (needs pass session)',
        freshness: vaultAt ? formatAgeFromIso(vaultAt) : undefined,
      },
      {
        fixCommand: vaultOk ? undefined : 'bun run vault:health:bake',
        impact: 'Portal /portal/vault/ board and nav badges need the bake artifact',
        autoFixable: true,
        timeToFix: vaultOk ? undefined : '1–3 min',
        envScope: 'dev',
      }
    )
  );

  const capSubset = joinPath(cwd, 'public/registry/capability-map-subset.json');
  const capOk = await fileExists(capSubset);
  const capAt = capOk ? await readBakeGeneratedAt(capSubset) : undefined;
  checks.push(
    withMeta(
      {
        id: 'capability-map-subset',
        level: 'warn',
        group: 'bakes',
        ok: capOk,
        message: capOk
          ? `public/registry/capability-map-subset.json present${capAt ? ` · ${formatAgeFromIso(capAt)}` : ''}`
          : 'capability-map-subset missing — bun run bake:capabilities',
        freshness: capAt ? formatAgeFromIso(capAt) : undefined,
      },
      {
        fixCommand: capOk ? undefined : 'bun run bake:capabilities',
        impact: 'Tools hub capabilities table and doctor/capability gates need the bake',
        autoFixable: true,
        timeToFix: capOk ? undefined : '1 min',
        envScope: 'all',
      }
    )
  );

  const bunfigState = joinPath(cwd, 'public/registry/bunfig-state.json');
  const bunfigOk = await fileExists(bunfigState);
  const bunfigAt = bunfigOk ? await readBakeGeneratedAt(bunfigState) : undefined;
  checks.push(
    withMeta(
      {
        id: 'bunfig-state-bake',
        level: 'info',
        group: 'bakes',
        ok: bunfigOk,
        message: bunfigOk
          ? `public/registry/bunfig-state.json present${bunfigAt ? ` · ${formatAgeFromIso(bunfigAt)}` : ''}`
          : 'bunfig-state bake missing — bun run bunfig:bake (optional)',
        freshness: bunfigAt ? formatAgeFromIso(bunfigAt) : undefined,
      },
      {
        fixCommand: bunfigOk ? undefined : 'bun run bunfig:bake',
        impact: 'Offline bunfig provenance board for portal tooling',
        autoFixable: true,
        timeToFix: bunfigOk ? undefined : '1 min',
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
          group: 'gates',
          ok: installVerify === 0,
          message:
            installVerify === 0 ? 'bun run install:verify OK' : 'bun run install:verify FAILED',
        },
        {
          fixCommand: installVerify === 0 ? undefined : 'bun run install:verify',
          impact: 'Machine cache/linker/configVersion gate used by CI and day-loop',
          autoFixable: false,
          timeToFix: installVerify === 0 ? undefined : '2–10 min',
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
          group: 'gates',
          ok: vaultGate === 0,
          message:
            vaultGate === 0
              ? 'portal-cli vault health (offline snap) OK'
              : 'vault-health tests FAILED',
        },
        {
          fixCommand: vaultGate === 0 ? undefined : 'bun run portal-cli vault health',
          impact: 'Vault-map inventory snapshot gate (CI / Harness Gates)',
          autoFixable: false,
          timeToFix: vaultGate === 0 ? undefined : '2–10 min',
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
          group: 'gates',
          ok: capGate === 0,
          message:
            capGate === 0
              ? 'capabilities health (subset tests) OK'
              : 'capability-map-subset tests FAILED',
        },
        {
          fixCommand: capGate === 0 ? undefined : 'bun run bake:capabilities:check',
          impact: 'Grounded capability map bake must match AGENTS.md',
          autoFixable: true,
          timeToFix: capGate === 0 ? undefined : '1–2 min',
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
    schemaVersion: 3,
    ok,
    full,
    verbose,
    failedOnly,
    generatedAt: new Date().toISOString(),
    checks,
    summary,
    docs: {
      isolatedInstalls: INSTALL_LINKER_DOCS.isolatedInstalls,
      defaultStrategy: INSTALL_LINKER_DOCS.installDefaultStrategy,
      installIsolated: INSTALL_LINKER_DOCS.installIsolated,
      installHoisted: INSTALL_LINKER_DOCS.installHoisted,
    },
  };
}

function statusMark(c: PortalDoctorCheck): string {
  if (c.ok) return c.level === 'info' ? '·' : '✓';
  return '✗';
}

/** Compact default listing with grouped sections. */
export function formatPortalDoctor(r: PortalDoctorReport): string {
  const display = filterDoctorChecks(r.checks, r.failedOnly);
  const modeBits = [
    r.ok ? 'OK' : 'FAIL',
    r.full ? 'full' : null,
    r.verbose ? 'verbose' : null,
    r.failedOnly ? 'failed-only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const lines = [`portal doctor  ${modeBits}`, ''];

  let lastGroup: PortalDoctorGroup | undefined;
  for (const c of display) {
    if (c.group !== lastGroup) {
      if (lastGroup) lines.push('');
      lines.push(`${GROUP_LABEL[c.group]}:`);
      lastGroup = c.group;
    }
    const mark = statusMark(c);
    lines.push(`  ${mark} [${c.level}] ${c.id}: ${c.message}`);
  }

  lines.push('');
  lines.push(formatDoctorSummaryFooter(r.summary, r.failedOnly));
  lines.push('');
  lines.push(`Docs: ${r.docs.defaultStrategy}`);
  lines.push(`      ${r.docs.isolatedInstalls}`);
  lines.push('');
  lines.push(
    'Related: portal-cli vault health · capabilities health · scanner doctor · bunfig check'
  );
  lines.push(
    '         bun run install:verify · portal-cli doctor --verbose · portal-cli doctor --full'
  );
  return lines.join('\n');
}

export function formatDoctorSummaryFooter(s: PortalDoctorSummary, failedOnly = false): string {
  const lines = [
    `Summary: ${s.passed}/${s.checkCount} passed · ${s.failed} failed` +
      ` (${s.failedFatal} fatal · ${s.failedWarn} warn)` +
      ` · levels ${s.fatal}f/${s.warn}w/${s.info}i` +
      ` · ${s.autoFixableFailed} auto-fixable`,
  ];
  if (s.autoFixableFailed > 0 && s.suggested.length) {
    lines.push('Suggested (auto-fixable):');
    for (const cmd of s.suggested) {
      lines.push(`  ${cmd}`);
    }
  } else if (s.failed > 0 && !failedOnly) {
    lines.push('Suggested: portal-cli doctor --verbose  # fix commands + impact');
  } else if (s.failed === 0) {
    lines.push('All checks green. Optional: portal-cli doctor --full  # spawn CI gates');
  }
  return lines.join('\n');
}

/**
 * Extended table for --verbose: check · level · status · what · fix · auto · scope · time.
 */
export function formatPortalDoctorVerbose(r: PortalDoctorReport): string {
  const display = filterDoctorChecks(r.checks, r.failedOnly);
  const rows = display.map(c => ({
    group: c.group,
    check: c.id,
    level: c.level,
    status: c.ok ? 'pass' : 'FAIL',
    what: truncate(c.message, 52),
    fix: truncate(c.fixCommand ?? (c.ok ? '—' : '?'), 44),
    auto: c.autoFixable === undefined ? '—' : c.autoFixable ? 'yes' : 'no',
    scope: c.envScope ?? '—',
    age: c.freshness ?? '—',
  }));

  const modeBits = [
    r.ok ? 'OK' : 'FAIL',
    r.full ? 'full' : null,
    'verbose',
    r.failedOnly ? 'failed-only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const header = [`portal doctor  ${modeBits}`, ''];

  let table: string;
  try {
    table = Bun.inspect.table(rows, {
      columns: ['group', 'check', 'level', 'status', 'what', 'fix', 'auto', 'scope', 'age'],
      colors: false,
    });
  } catch {
    table = rows
      .map(
        row =>
          `${row.status === 'pass' ? '✓' : '✗'} ${row.check.padEnd(26)} ${row.level.padEnd(6)} ${row.fix}`
      )
      .join('\n');
  }

  const impactLines: string[] = ['', 'Remediation detail (failures only):'];
  const failures = r.checks.filter(c => !c.ok);
  if (failures.length === 0) {
    impactLines.push('  (none — all checks passed)');
  } else {
    for (const c of failures) {
      impactLines.push(`  · ${c.id} [${c.level}]`);
      if (c.impact) impactLines.push(`      impact: ${c.impact}`);
      if (c.fixCommand) impactLines.push(`      fix:    ${c.fixCommand}`);
      if (c.source) impactLines.push(`      doc:    ${c.source}`);
      if (c.timeToFix) impactLines.push(`      time:   ${c.timeToFix}`);
      if (c.envScope) impactLines.push(`      scope:  ${c.envScope}`);
    }
  }

  // Compact linker reference always (policy SSOT)
  impactLines.push('', 'Linker policy reference:');
  for (const id of ['linker-config-version', 'machine-isolated-linker'] as const) {
    const c = r.checks.find(x => x.id === id);
    if (!c) continue;
    impactLines.push(`  · ${c.id}: ${c.ok ? 'pass' : 'FAIL'} — ${c.message}`);
    if (c.impact) impactLines.push(`      ${c.impact}`);
    if (c.source) impactLines.push(`      ${c.source}`);
  }

  return [
    ...header,
    table,
    '',
    formatDoctorSummaryFooter(r.summary, r.failedOnly),
    ...impactLines,
    '',
    `Docs: ${r.docs.defaultStrategy}`,
    `      ${r.docs.isolatedInstalls}`,
    `      ${r.docs.installIsolated}`,
    `      ${r.docs.installHoisted}`,
  ].join('\n');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

// @see https://bun.com/docs/pm/isolated-installs — configVersion + linker defaults
// @see https://bun.com/docs/pm/cli/install#default-strategy — lockfile configVersion
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth (cli-chrome tables)
/**
 * portal-cli doctor — unified offline health gate for portal control plane.
 *
 * Fast pure checks by default (no network). Linker policy is mandatory:
 *   bun.lock configVersion must be 1 for this workspace monorepo.
 *
 *   portal-cli doctor
 *   portal-cli doctor --json
 *   portal-cli doctor --verbose     # table: fix · auto · impact · scope
 *   portal-cli doctor --failed-only # hide passing checks
 *   portal-cli doctor --full        # spawn install:verify · vault · capability gates
 *   portal-cli doctor --group catalog
 *   portal-cli doctor --group bunfig
 *   portal-cli doctor --group linker --group catalog
 *   portal-cli doctor --env ci      # skip envScope=dev checks
 *
 * Bunfig probes: tools/lib/portal-cli-doctor-bunfig.ts
 * Bake: bun run bake:doctor · check: bun run bake:doctor --check · board: /portal/doctor/
 *
 * Fix commands use real monorepo scripts only (no invented Bun flags).
 *
 * @see lib/docs/bun-install-linker-docs.ts
 * @see scripts/verify-install-cache.ts (install:verify)
 * @see tools/lib/portal-cli-doctor-catalog.ts
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
import {
  cliTone,
  columnTable,
  displayWidth,
  frameBlock,
  kvLines,
  padDisplay,
  truncateDisplay,
} from '../../lib/portal/cli-chrome.ts';
import { runCatalogChecks } from './portal-cli-doctor-catalog.ts';
import { runBunfigChecks } from './portal-cli-doctor-bunfig.ts';
import { runInfraChecks } from './portal-cli-doctor-infra.ts';

export type PortalDoctorLevel = 'fatal' | 'warn' | 'info';
export type PortalDoctorEnvScope = 'dev' | 'ci' | 'all';
export type PortalDoctorGroup = 'linker' | 'bakes' | 'catalog' | 'bunfig' | 'infra' | 'gates';

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
  /** When true, only runs under --full (spawned gates). */
  heavy?: boolean;
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
  schemaVersion: 4;
  ok: boolean;
  full: boolean;
  verbose: boolean;
  failedOnly: boolean;
  /** Optional single-group filter (legacy; prefer groups). */
  group?: PortalDoctorGroup;
  /** Optional multi-group filter (OR). */
  groups?: PortalDoctorGroup[];
  /** Optional env filter: ci skips envScope=dev checks. */
  env?: PortalDoctorEnvScope;
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
  /** Only include checks from this group (e.g. catalog). */
  group?: PortalDoctorGroup;
  /** Multi-group filter (OR). When set, overrides single group. */
  groups?: PortalDoctorGroup[];
  /**
   * Env filter for envScope:
   * - `ci` → include envScope `ci` | `all` (skip `dev`)
   * - `dev` → include `dev` | `all`
   * - `all` / omit → no env filter
   */
  env?: PortalDoctorEnvScope;
  /** Inject spawn for tests */
  spawn?: (argv: string[], opts?: { cwd?: string }) => Promise<number>;
  /**
   * Inject fetch for infra Access probes (tests).
   * When omitted, live HTTPS probes run (ledger + portal).
   */
  accessFetch?: import('../../lib/verification/cloudflare-access-live.ts').AccessProbeFetch;
  /** Skip live Access probes (offline pure tests). */
  skipLiveAccess?: boolean;
};

export const GROUP_LABEL: Record<PortalDoctorGroup, string> = {
  linker: 'Linker policy',
  bakes: 'Offline bakes',
  catalog: 'Catalog SSOT',
  bunfig: 'Bunfig SSOT',
  infra: 'Infra · Access',
  gates: 'Spawned gates',
};

export const PORTAL_DOCTOR_GROUPS: PortalDoctorGroup[] = [
  'linker',
  'bakes',
  'catalog',
  'bunfig',
  'infra',
  'gates',
];

export function parseDoctorGroup(raw: string | undefined): PortalDoctorGroup | undefined {
  if (!raw) return undefined;
  if ((PORTAL_DOCTOR_GROUPS as string[]).includes(raw)) return raw as PortalDoctorGroup;
  throw new Error(
    `Unknown doctor --group=${raw}; expect one of: ${PORTAL_DOCTOR_GROUPS.join(' | ')}`
  );
}

/**
 * Parse one or more --group values from argv.
 * Supports: --group catalog · --group=linker · --group linker,catalog · repeated --group
 */
export function parseDoctorGroupsFromArgv(argv: string[]): PortalDoctorGroup[] | undefined {
  const raw: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--group=')) {
      raw.push(...a.slice('--group='.length).split(','));
    } else if (a === '--group') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        raw.push(...next.split(','));
        i++;
      }
    }
  }
  const tokens = raw.map(s => s.trim()).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const groups: PortalDoctorGroup[] = [];
  for (const t of tokens) {
    const g = parseDoctorGroup(t);
    if (g && !groups.includes(g)) groups.push(g);
  }
  return groups;
}

export function parseDoctorEnv(raw: string | undefined): PortalDoctorEnvScope | undefined {
  if (!raw) return undefined;
  if (raw === 'dev' || raw === 'ci' || raw === 'all') return raw;
  throw new Error(`Unknown doctor --env=${raw}; expect one of: dev | ci | all`);
}

/** Apply group(s) + env filters (pure). */
export function filterDoctorByScope(
  checks: PortalDoctorCheck[],
  opts: {
    group?: PortalDoctorGroup;
    groups?: PortalDoctorGroup[];
    env?: PortalDoctorEnvScope;
  }
): PortalDoctorCheck[] {
  let out = checks;
  const groups = opts.groups?.length ? opts.groups : opts.group ? [opts.group] : undefined;
  if (groups && groups.length > 0) {
    const set = new Set(groups);
    out = out.filter(c => set.has(c.group));
  }
  if (opts.env && opts.env !== 'all') {
    out = out.filter(c => {
      const scope = c.envScope ?? 'all';
      if (opts.env === 'ci') return scope === 'ci' || scope === 'all';
      if (opts.env === 'dev') return scope === 'dev' || scope === 'all';
      return true;
    });
  }
  return out;
}

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
  const groups = opts.groups?.length ? opts.groups : opts.group ? [opts.group] : undefined;
  const group = groups?.length === 1 ? groups[0] : opts.group;
  const env = opts.env;
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

  // 3) Catalog SSOT health (runtime flags — pure, no network)
  //    catalog-json-schema · catalog-shortcode-conflict · catalog-help-coverage · catalog-deprecated-flags
  const catalogResult = await runCatalogChecks(cwd);
  checks.push(...catalogResult.checks);

  // 3b) Bunfig machine/project SSOT
  checks.push(...(await runBunfigChecks(cwd)));

  // 3c) Infra · live Cloudflare Access probes (ledger fatal · portal warn)
  checks.push(
    ...(await runInfraChecks({
      fetch: opts.accessFetch,
      skipLive: opts.skipLiveAccess,
    }))
  );

  // 4) Optional full: spawn existing gates (no network assumed)
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

  // Scope filters (group(s) / env) apply to report checks + summary + exit ok
  const scoped = filterDoctorByScope(checks, { group, groups, env });

  // Default mode: only fatal failures fail the doctor; warns are advisory
  const ok = scoped.filter(c => c.level === 'fatal').every(c => c.ok);
  const summary = summarizeDoctorChecks(scoped);

  return {
    kind: 'portal-cli-doctor',
    schemaVersion: 4,
    ok,
    full,
    verbose,
    failedOnly,
    group,
    groups,
    env,
    generatedAt: new Date().toISOString(),
    checks: scoped,
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

function doctorModeLabel(r: PortalDoctorReport): string {
  const groups = r.groups?.length ? r.groups.join('+') : r.group ? r.group : null;
  return [
    r.full ? 'full' : null,
    r.verbose ? 'verbose' : null,
    r.failedOnly ? 'failed-only' : null,
    groups ? `group=${groups}` : null,
    r.env && r.env !== 'all' ? `env=${r.env}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Compact default listing — one check per line inside a frame.
 * Long prose/fix URLs stay in --verbose (default must stay scannable).
 */
export function formatPortalDoctor(r: PortalDoctorReport): string {
  const display = filterDoctorChecks(r.checks, r.failedOnly);
  const body: string[] = [];
  // Frame inner content ≈ width - 4 (│ + spaces)
  const frameWidth = 80;
  const lineMax = frameWidth - 4;

  let lastGroup: PortalDoctorGroup | undefined;
  for (const c of display) {
    if (c.group !== lastGroup) {
      if (lastGroup) body.push('');
      body.push(cliTone.accent(GROUP_LABEL[c.group]));
      lastGroup = c.group;
    }
    const mark = c.ok ? cliTone.ok(statusMark(c)) : cliTone.fail(statusMark(c));
    // Fixed-width level tag: [fatal] [warn]  [info]  — no mid-bracket padding
    const levelTag = padDisplay(`[${c.level}]`, 7);
    // `  ✓ [fatal] id  message…` — truncate message so the line never wraps the frame
    const head = `  ${mark} ${levelTag} ${c.id}`;
    const headW = displayWidth(Bun.stripANSI(head));
    const gap = 2;
    const msgBudget = Math.max(12, lineMax - headW - gap);
    const msg = truncateDisplay(c.message, msgBudget);
    body.push(`${head}${' '.repeat(gap)}${cliTone.dim(msg)}`);
  }

  body.push('');
  for (const line of formatDoctorSummaryFooter(r.summary, r.failedOnly).split('\n')) {
    body.push(truncateDisplay(line, lineMax));
  }

  const mode = doctorModeLabel(r);
  return (
    frameBlock('portal doctor', r.ok ? 'OK' : 'FAIL', body, {
      width: frameWidth,
      ok: r.ok,
    }) + (mode ? `\n${cliTone.dim(`  mode · ${mode}`)}` : '')
  );
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
 * Extended table for --verbose: check · level · status · what · fix · auto · impact · scope
 * Table is printed unframed so Bun.stringWidth columns stay aligned.
 */
export function formatPortalDoctorVerbose(r: PortalDoctorReport): string {
  const display = filterDoctorChecks(r.checks, r.failedOnly);
  const tableRows = display.map(c => [
    c.group,
    c.id,
    c.level,
    c.ok ? 'pass' : 'FAIL',
    c.message,
    c.ok ? '—' : (c.fixCommand ?? '?'),
    c.autoFixable === undefined ? '—' : c.autoFixable ? 'yes' : 'no',
    c.impact ?? '—',
    c.envScope ?? '—',
  ]);

  const table = columnTable(
    ['group', 'check', 'level', 'status', 'what', 'fix', 'auto', 'impact', 'scope'],
    tableRows,
    { maxWidths: [8, 26, 6, 5, 40, 40, 4, 32, 4], gap: 2 }
  ).join('\n');

  const summaryBody: string[] = [
    ...kvLines([
      ['checks', `${r.summary.passed}/${r.summary.checkCount} passed`],
      [
        'failed',
        `${r.summary.failed} (${r.summary.failedFatal} fatal · ${r.summary.failedWarn} warn)`,
      ],
      ['auto-fix', String(r.summary.autoFixableFailed)],
    ]),
  ];
  if (r.summary.autoFixableFailed > 0 && r.summary.suggested.length) {
    summaryBody.push('');
    summaryBody.push(cliTone.accent('Auto-fix available'));
    for (const cmd of r.summary.suggested) {
      summaryBody.push(`  ${cmd}`);
    }
  }

  const failures = r.checks.filter(c => !c.ok);
  const remBody: string[] = [];
  if (failures.length === 0) {
    remBody.push(cliTone.dim('(none — all checks passed)'));
  } else {
    for (const c of failures) {
      remBody.push(`· ${c.id} [${c.level}]`);
      if (c.impact) remBody.push(cliTone.dim(`  impact  ${c.impact}`));
      if (c.fixCommand) remBody.push(cliTone.dim(`  fix     ${c.fixCommand}`));
      if (c.source) remBody.push(cliTone.dim(`  doc     ${c.source}`));
    }
  }

  const mode = doctorModeLabel({ ...r, verbose: true });
  const head = frameBlock('portal doctor', r.ok ? 'OK' : 'FAIL', summaryBody, {
    width: 72,
    ok: r.ok,
  });
  const rem = frameBlock('remediation', failures.length ? 'ACTION' : 'none', remBody, {
    width: 72,
    ok: failures.length === 0,
  });

  return [
    head,
    mode ? cliTone.dim(`  mode · ${mode}`) : '',
    '',
    cliTone.accent('Checks'),
    table,
    '',
    rem,
    '',
    cliTone.dim(`docs · ${r.docs.defaultStrategy}`),
    cliTone.dim(`     · ${r.docs.isolatedInstalls}`),
  ]
    .filter(Boolean)
    .join('\n');
}

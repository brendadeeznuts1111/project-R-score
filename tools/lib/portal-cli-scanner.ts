// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/pm/isolated-installs — configVersion + linker defaults
// @see https://bun.com/docs/pm/security-scanner-api — Security Scanner API
// @see https://bun.com/docs/runtime/bunfig#install-security-scanner — [install.security] scanner
// @see https://bun.com/docs/pm/cli/pm — bun pm scan
// @see https://bun.com/docs/pm/cli/audit — bun audit
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — dry-run install flag
/**
 * portal-cli scanner — grounded Bun Security Scanner control plane.
 *
 * Real surface (do not invent):
 *   - Configure: bunfig.toml `[install.security] scanner = "pkg"`
 *   - One-off / lockfile scan: `bun pm scan` (requires scanner configured)
 *   - Scanner packages export `scanner: Bun.Security.Scanner` with `version: "1"`
 *     and `scan({ packages })` → `Bun.Security.Advisory[]` (fatal | warn)
 *   - Optional Socket org mode: SOCKET_API_KEY (packages:list scope)
 *
 * Quota policy (FactoryWager monorepo ~750 lockfile packages):
 *   - Default: NO install-time scanner in bunfig (every bun install/add would hit
 *     Socket free API once per purl → burns free quota). Use on-demand scan.
 *   - `portal-cli scanner scan` has a cooldown (default 24h); pass --force to override.
 *   - Prefer free mode (no SOCKET_API_KEY in .env) unless org token + packages:list.
 *   - Alternate CVE path: `bun audit` (npm registry) — no Socket quota.
 *
 * Docs example package `@oven/bun-security-scanner` is **not** a real npm package.
 * Official authoring template: https://github.com/oven-sh/security-scanner-template
 * Real Socket package: @socketsecurity/bun-security-scanner
 *
 *   portal-cli scanner status|doctor|policy|estimate|vault|scan [--force]
 *   portal-cli scanner configure|clear|install|init
 */

import { bunSpawnArgs } from '../../lib/bun-executable.ts';
import { jsonOut } from '../../lib/console-depth.ts';

export const SECURITY_SCANNER_DOCS = 'https://bun.com/docs/pm/security-scanner-api';
export const SECURITY_SCANNER_BUNFIG =
  'https://bun.com/docs/runtime/bunfig#install-security-scanner';
export const SECURITY_SCANNER_TEMPLATE = 'https://github.com/oven-sh/security-scanner-template';
/** Official Socket scanner (real npm package — not the docs placeholder). */
export const SOCKET_SCANNER_PACKAGE = '@socketsecurity/bun-security-scanner';
/** Canonical Proton Pass ref for Socket authenticated mode (packages scope). */
export const SOCKET_API_KEY_PASS_REF = 'pass://factorywager/Socket API Key/password';
export const SOCKET_API_KEY_ENV = 'SOCKET_API_KEY';
export const SOCKET_API_KEY_VAULT = 'factorywager';
export const SOCKET_API_KEY_ITEM = 'Socket API Key';
export const SOCKET_API_KEY_FIELD = 'password';
export const DEFAULT_BUNFIG_REL = 'bunfig.toml';
export const DEFAULT_ENV_TEMPLATE_REL = 'env.template';
export const DEFAULT_VAULT_MAP_REL = 'config/vault-map.toml';
export const DEFAULT_PACKAGE_JSON_REL = 'package.json';
export const DEFAULT_LOCKFILE_REL = 'bun.lock';
export const DEFAULT_INIT_DIR = 'my-security-scanner';
/** Last on-demand scan stamp (no secrets) — gitignored under tmp/. */
export const SCANNER_LAST_REL = 'tmp/portal-scanner-last.json';
/** Default min hours between on-demand scans (protect free Socket quota). */
export const DEFAULT_SCAN_COOLDOWN_HOURS = 24;
/** Env override: PORTAL_SCANNER_COOLDOWN_HOURS=0 disables cooldown. */
export const SCAN_COOLDOWN_ENV = 'PORTAL_SCANNER_COOLDOWN_HOURS';

export type ScannerLastRun = {
  kind: 'portal-scanner-last';
  schemaVersion: 1;
  at: string;
  mode: 'free' | 'authenticated' | 'unconfigured';
  exitCode: number;
  packageCountEstimate: number | null;
  force: boolean;
};

/** Approximate package entries from bun.lock text (JSON-with-trailing-commas). */
export function estimateLockfilePackageCountFromText(text: string): number {
  // bun.lock v1 "packages" values are arrays: `    "@scope/name": ["@scope/name@1.0.0", ...`
  // Also accept object form `    "name": {` for older shapes.
  let n = 0;
  let inPackages = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*"packages"\s*:\s*\{/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    // end of top-level packages map (2-space close after entries)
    if (/^\s{2}\},?\s*$/.test(line) && n > 0) break;
    if (/^\s{4}"[^"]+"\s*:\s*[[{]/.test(line)) n++;
  }
  return n;
}

export async function estimateLockfilePackageCount(
  lockPath: string = DEFAULT_LOCKFILE_REL
): Promise<number | null> {
  const f = Bun.file(lockPath);
  if (!(await f.exists())) return null;
  return estimateLockfilePackageCountFromText(await f.text());
}

export function resolveScanCooldownHours(
  env: Record<string, string | undefined> = Bun.env
): number {
  const raw = env[SCAN_COOLDOWN_ENV];
  if (raw === undefined || raw === '') return DEFAULT_SCAN_COOLDOWN_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_SCAN_COOLDOWN_HOURS;
  return n;
}

export async function readScannerLastRun(
  path: string = SCANNER_LAST_REL
): Promise<ScannerLastRun | null> {
  const f = Bun.file(path);
  if (!(await f.exists())) return null;
  try {
    const j = (await f.json()) as ScannerLastRun;
    if (j?.kind !== 'portal-scanner-last' || typeof j.at !== 'string') return null;
    return j;
  } catch {
    return null;
  }
}

export async function writeScannerLastRun(
  run: ScannerLastRun,
  path: string = SCANNER_LAST_REL
): Promise<void> {
  await Bun.write(path, `${JSON.stringify(run, null, 2)}\n`);
}

export type ScanCooldownDecision = {
  skip: boolean;
  reason: string;
  last: ScannerLastRun | null;
  cooldownHours: number;
  remainingMs: number;
};

export function evaluateScanCooldown(
  last: ScannerLastRun | null,
  opts: { force?: boolean; cooldownHours?: number; nowMs?: number } = {}
): ScanCooldownDecision {
  const cooldownHours = opts.cooldownHours ?? DEFAULT_SCAN_COOLDOWN_HOURS;
  const nowMs = opts.nowMs ?? Date.now();
  if (opts.force) {
    return {
      skip: false,
      reason: 'forced (--force)',
      last,
      cooldownHours,
      remainingMs: 0,
    };
  }
  if (cooldownHours <= 0) {
    return {
      skip: false,
      reason: 'cooldown disabled',
      last,
      cooldownHours,
      remainingMs: 0,
    };
  }
  if (!last?.at) {
    return {
      skip: false,
      reason: 'no prior on-demand scan',
      last,
      cooldownHours,
      remainingMs: 0,
    };
  }
  const lastMs = Date.parse(last.at);
  if (!Number.isFinite(lastMs)) {
    return {
      skip: false,
      reason: 'prior stamp unreadable',
      last,
      cooldownHours,
      remainingMs: 0,
    };
  }
  const windowMs = cooldownHours * 3600_000;
  const elapsed = nowMs - lastMs;
  if (elapsed < windowMs) {
    return {
      skip: true,
      reason: `within ${cooldownHours}h cooldown`,
      last,
      cooldownHours,
      remainingMs: windowMs - elapsed,
    };
  }
  return {
    skip: false,
    reason: 'cooldown elapsed',
    last,
    cooldownHours,
    remainingMs: 0,
  };
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  return `${Math.max(1, m)}m`;
}

export type PackageMgmtPolicy = {
  kind: 'portal-cli-package-policy';
  exact: boolean | undefined;
  frozenLockfile: boolean | undefined;
  saveTextLockfile: boolean | undefined;
  /** bun.lock configVersion — 1 + workspaces → isolated default (Bun docs). */
  configVersion: number | null;
  lockfileVersion: number | null;
  hasWorkspaces: boolean;
  expectsIsolatedDefault: boolean;
  linker: string | null;
  globalStore: boolean | null;
  installTimeScanner: string | undefined;
  socketMode: InstallSecurityStatus['mode'];
  socketApiKeySet: boolean;
  packageCountEstimate: number | null;
  scanCooldownHours: number;
  lastScan: ScannerLastRun | null;
  cooldown: ScanCooldownDecision;
  quotaNotes: string[];
};

export function buildPackageMgmtPolicy(
  status: InstallSecurityStatus,
  extras: {
    packageCountEstimate: number | null;
    lastScan: ScannerLastRun | null;
    saveTextLockfile?: boolean;
    cooldownHours?: number;
    configVersion?: number | null;
    lockfileVersion?: number | null;
    hasWorkspaces?: boolean;
    expectsIsolatedDefault?: boolean;
    linker?: string | null;
    globalStore?: boolean | null;
  }
): PackageMgmtPolicy {
  const cooldownHours = extras.cooldownHours ?? resolveScanCooldownHours();
  const cooldown = evaluateScanCooldown(extras.lastScan, { cooldownHours });
  const n = extras.packageCountEstimate;
  const quotaNotes: string[] = [
    'Socket free mode (no SOCKET_API_KEY): public firewall-api.socket.dev — ~1 request per lockfile package per scan/install.',
    'Socket authenticated mode: org API + paid quota; needs packages:list scope (token 401 without it).',
    'Factory default: install-time scanner OFF in bunfig; on-demand `portal-cli scanner scan` with cooldown.',
    'CVE alternate (no Socket): `bun audit` — no Socket quota.',
    'Linker: monorepo uses isolated (machine ~/.bunfig.toml); lockfile configVersion=1 + workspaces → isolated default.',
  ];
  if (n != null && n > 200) {
    quotaNotes.push(
      `This lockfile ≈ ${n} packages — one free-mode scan ≈ ${n} public API hits. Prefer cooldown + intentional --force.`
    );
  }
  if (status.scanner) {
    quotaNotes.push(
      'Install-time scanner ON: every `bun install` / `bun add` re-scans packages (high quota cost). Clear with `portal-cli scanner clear --write` for day-to-day.'
    );
  }
  return {
    kind: 'portal-cli-package-policy',
    exact: status.exact,
    frozenLockfile: status.frozenLockfile,
    saveTextLockfile: extras.saveTextLockfile,
    configVersion: extras.configVersion ?? null,
    lockfileVersion: extras.lockfileVersion ?? null,
    hasWorkspaces: extras.hasWorkspaces ?? false,
    expectsIsolatedDefault: extras.expectsIsolatedDefault ?? false,
    linker: extras.linker ?? null,
    globalStore: extras.globalStore ?? null,
    installTimeScanner: status.scanner,
    socketMode: status.mode,
    socketApiKeySet: status.socketApiKeySet,
    packageCountEstimate: n,
    scanCooldownHours: cooldownHours,
    lastScan: extras.lastScan,
    cooldown,
    quotaNotes,
  };
}

export function formatPackageMgmtPolicy(p: PackageMgmtPolicy): string {
  const lastAt = p.lastScan?.at ?? '(never)';
  const lines = [
    'FactoryWager package management policy (Bun-aligned)',
    '',
    'Lockfile + linker (https://bun.com/docs/pm/isolated-installs):',
    `  configVersion:      ${p.configVersion ?? '— (MISSING — run bun install; monorepo requires 1)'}`,
    `  lockfileVersion:    ${p.lockfileVersion ?? '—'}`,
    `  workspaces:         ${p.hasWorkspaces ? 'yes' : 'no'}`,
    `  expects isolated:   ${p.expectsIsolatedDefault ? 'yes (configVersion=1 + workspaces)' : 'no'}`,
    `  linker:             ${p.linker ?? '—'} (machine SSOT ~/.bunfig.toml)`,
    `  globalStore:        ${p.globalStore === null || p.globalStore === undefined ? '—' : String(p.globalStore)}`,
    '',
    'Install SSOT (workspace bunfig.toml):',
    `  exact:              ${p.exact === undefined ? '—' : String(p.exact)}`,
    `  frozenLockfile:     ${p.frozenLockfile === undefined ? '—' : String(p.frozenLockfile)}`,
    `  saveTextLockfile:   ${p.saveTextLockfile === undefined ? '—' : String(p.saveTextLockfile)}`,
    `  install-time scanner: ${p.installTimeScanner ?? '(off — on-demand only)'}`,
    '',
    'Socket / security:',
    `  mode:               ${p.socketMode}`,
    `  SOCKET_API_KEY:     ${p.socketApiKeySet ? 'set' : 'unset (free mode)'}`,
    `  lockfile packages≈  ${p.packageCountEstimate ?? '—'}`,
    `  scan cooldown:      ${p.scanCooldownHours}h (env ${SCAN_COOLDOWN_ENV})`,
    `  last on-demand:     ${lastAt}`,
    `  next scan:          ${
      p.cooldown.skip
        ? `wait ${formatDurationMs(p.cooldown.remainingMs)} (or --force)`
        : 'allowed now'
    }`,
    '',
    'Quota notes:',
    ...p.quotaNotes.map(n => `  · ${n}`),
    '',
    'Commands:',
    '  portal-cli scanner estimate',
    '  portal-cli scanner scan            # respects cooldown',
    '  portal-cli scanner scan --force    # intentional full scan (CI / after bun add)',
    '  portal-cli scanner configure @socketsecurity/bun-security-scanner --write  # install-time ON',
    '  portal-cli scanner clear --write   # install-time OFF (recommended day-to-day)',
    '  bun audit                          # npm advisories (no Socket)',
    '  bun run install:verify             # configVersion 1 + isolated linker gate',
    '',
    `Docs: ${SECURITY_SCANNER_DOCS}`,
    'Isolated installs: https://bun.com/docs/pm/isolated-installs',
    'Default strategy: https://bun.com/docs/pm/cli/install#default-strategy',
    'Install CLI isolated: https://bun.com/docs/pm/cli/install#isolated-installs',
    'Install CLI hoisted: https://bun.com/docs/pm/cli/install#hoisted-installs',
    'Bun install: https://bun.com/docs/pm/cli/install',
  ];
  return lines.join('\n');
}

/** npm package name shape: name or @scope/name (no invented packages). */
const SCANNER_PKG_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;

export function isValidScannerPackageName(name: string): boolean {
  const n = name.trim();
  if (!n || n.length > 214) return false;
  // Local path / link targets are allowed for advanced users (./scanner, file:, link:)
  if (n.startsWith('./') || n.startsWith('../') || n.startsWith('file:') || n.startsWith('link:')) {
    return true;
  }
  // bare `.hidden` / `_reserved` npm names are invalid
  if (n.startsWith('.') || n.startsWith('_')) return false;
  return SCANNER_PKG_RE.test(n);
}

export type InstallSecurityStatus = {
  bunfigPath: string;
  bunfigExists: boolean;
  /** Package name from [install.security] scanner, if set */
  scanner: string | undefined;
  frozenLockfile: boolean | undefined;
  exact: boolean | undefined;
  saveTextLockfile: boolean | undefined;
  /**
   * Whether SOCKET_API_KEY is present in the process env (value never returned).
   * Socket free mode works without it; org settings need packages-scoped token.
   */
  socketApiKeySet: boolean;
  /** Canonical vault ref for inject (no secret value). */
  socketApiKeyPassRef: string;
  /** True when package.json lists the configured scanner (deps or devDeps). */
  scannerInPackageJson: boolean;
  /** True when node_modules/<scanner>/package.json exists. */
  scannerInNodeModules: boolean;
  /** env.template contains SOCKET_API_KEY=…pass://… */
  socketInEnvTemplate: boolean;
  /** config/vault-map.toml has [env.SOCKET_API_KEY] */
  socketInVaultMap: boolean;
  /** Template pass ref matches vault-map / canonical (when both present). */
  socketRefsAligned: boolean;
  /** Effective mode label for humans / JSON */
  mode: 'unconfigured' | 'free' | 'authenticated';
};

/**
 * Read scanner package from bunfig text via Bun.TOML.parse.
 * Missing file / missing key → undefined (not throw).
 */
export function parseInstallSecurityFromText(text: string): {
  scanner: string | undefined;
  frozenLockfile: boolean | undefined;
  exact: boolean | undefined;
  saveTextLockfile: boolean | undefined;
} {
  let parsed: unknown;
  try {
    parsed = Bun.TOML.parse(text);
  } catch {
    return {
      scanner: undefined,
      frozenLockfile: undefined,
      exact: undefined,
      saveTextLockfile: undefined,
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      scanner: undefined,
      frozenLockfile: undefined,
      exact: undefined,
      saveTextLockfile: undefined,
    };
  }
  const install = (parsed as Record<string, unknown>).install;
  if (!install || typeof install !== 'object') {
    return {
      scanner: undefined,
      frozenLockfile: undefined,
      exact: undefined,
      saveTextLockfile: undefined,
    };
  }
  const inst = install as Record<string, unknown>;
  const security = inst.security;
  let scanner: string | undefined;
  if (security && typeof security === 'object') {
    const s = (security as Record<string, unknown>).scanner;
    if (typeof s === 'string' && s.trim()) scanner = s.trim();
  }
  return {
    scanner,
    frozenLockfile: typeof inst.frozenLockfile === 'boolean' ? inst.frozenLockfile : undefined,
    exact: typeof inst.exact === 'boolean' ? inst.exact : undefined,
    saveTextLockfile:
      typeof inst.saveTextLockfile === 'boolean' ? inst.saveTextLockfile : undefined,
  };
}

/** True when SOCKET_API_KEY is a non-empty env string (never returns the value). */
export function isSocketApiKeySet(env: Record<string, string | undefined> = Bun.env): boolean {
  const v = env[SOCKET_API_KEY_ENV];
  return typeof v === 'string' && v.trim().length > 0;
}

/** Extract pass://… ref from env.template line for SOCKET_API_KEY (if any). */
export function parseSocketPassRefFromEnvTemplate(text: string): string | undefined {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    // Item titles may contain spaces: pass://vault/Socket API Key/password
    const m = t.match(/^SOCKET_API_KEY\s*=\s*(?:\{\{\s*)?(pass:\/\/.+?)(?:\s*\}\})?\s*$/);
    if (m?.[1]) return m[1]!.trim();
  }
  return undefined;
}

/** Read [env.SOCKET_API_KEY] pass path pieces from vault-map TOML text. */
export function parseSocketFromVaultMapText(text: string): {
  present: boolean;
  passRef: string | undefined;
} {
  let parsed: unknown;
  try {
    parsed = Bun.TOML.parse(text);
  } catch {
    return { present: false, passRef: undefined };
  }
  if (!parsed || typeof parsed !== 'object') return { present: false, passRef: undefined };
  const env = (parsed as Record<string, unknown>).env;
  if (!env || typeof env !== 'object') return { present: false, passRef: undefined };
  const sock = (env as Record<string, unknown>).SOCKET_API_KEY;
  if (!sock || typeof sock !== 'object') return { present: false, passRef: undefined };
  const s = sock as Record<string, unknown>;
  const vault = typeof s.vault === 'string' ? s.vault : undefined;
  const item = typeof s.item === 'string' ? s.item : undefined;
  const field = typeof s.field === 'string' ? s.field : undefined;
  if (!vault || !item || !field) return { present: true, passRef: undefined };
  return { present: true, passRef: `pass://${vault}/${item}/${field}` };
}

/** Whether package.json deps/devDeps list the scanner package name. */
export function packageJsonHasScanner(
  pkgJson: Record<string, unknown> | null | undefined,
  scanner: string | undefined
): boolean {
  if (!scanner || !pkgJson || typeof pkgJson !== 'object') return false;
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
    const block = pkgJson[key];
    if (block && typeof block === 'object' && scanner in (block as object)) return true;
  }
  return false;
}

export type ScannerStatusPaths = {
  bunfigPath?: string;
  envTemplatePath?: string;
  vaultMapPath?: string;
  packageJsonPath?: string;
  cwd?: string;
};

/** Load status from bunfig + template + vault-map + package tree (repo root default). */
export async function readInstallSecurityStatus(
  bunfigPath: string = DEFAULT_BUNFIG_REL,
  paths: ScannerStatusPaths = {}
): Promise<InstallSecurityStatus> {
  const cwd = paths.cwd ?? process.cwd();
  const envTemplatePath = paths.envTemplatePath ?? `${cwd}/${DEFAULT_ENV_TEMPLATE_REL}`;
  const vaultMapPath = paths.vaultMapPath ?? `${cwd}/${DEFAULT_VAULT_MAP_REL}`;
  const packageJsonPath = paths.packageJsonPath ?? `${cwd}/${DEFAULT_PACKAGE_JSON_REL}`;
  const resolvedBunfig = paths.bunfigPath ?? bunfigPath;

  const socketApiKeySet = isSocketApiKeySet();
  const f = Bun.file(resolvedBunfig);
  const exists = await f.exists();
  let scanner: string | undefined;
  let frozenLockfile: boolean | undefined;
  let exact: boolean | undefined;
  let saveTextLockfile: boolean | undefined;
  if (exists) {
    const parsed = parseInstallSecurityFromText(await f.text());
    scanner = parsed.scanner;
    frozenLockfile = parsed.frozenLockfile;
    exact = parsed.exact;
    saveTextLockfile = parsed.saveTextLockfile;
  }

  let scannerInPackageJson = false;
  const pkgFile = Bun.file(packageJsonPath);
  if (await pkgFile.exists()) {
    try {
      const pj = (await pkgFile.json()) as Record<string, unknown>;
      // Prefer configured scanner name; also detect Socket package when install-time is off
      scannerInPackageJson =
        packageJsonHasScanner(pj, scanner) || packageJsonHasScanner(pj, SOCKET_SCANNER_PACKAGE);
    } catch {
      scannerInPackageJson = false;
    }
  }

  let scannerInNodeModules = false;
  for (const name of [scanner, SOCKET_SCANNER_PACKAGE].filter(Boolean) as string[]) {
    // scoped packages: @scope/name → node_modules/@scope/name/package.json
    const nm = `${cwd}/node_modules/${name}/package.json`;
    if (await Bun.file(nm).exists()) {
      scannerInNodeModules = true;
      break;
    }
  }

  let socketInEnvTemplate = false;
  let templatePassRef: string | undefined;
  const envFile = Bun.file(envTemplatePath);
  if (await envFile.exists()) {
    templatePassRef = parseSocketPassRefFromEnvTemplate(await envFile.text());
    socketInEnvTemplate = Boolean(templatePassRef);
  }

  let socketInVaultMap = false;
  let mapPassRef: string | undefined;
  const mapFile = Bun.file(vaultMapPath);
  if (await mapFile.exists()) {
    const vm = parseSocketFromVaultMapText(await mapFile.text());
    socketInVaultMap = vm.present;
    mapPassRef = vm.passRef;
  }

  const refs = [templatePassRef, mapPassRef, SOCKET_API_KEY_PASS_REF].filter((r): r is string =>
    Boolean(r)
  );
  const socketRefsAligned = refs.length === 0 ? true : refs.every(r => r === refs[0]);

  const mode: InstallSecurityStatus['mode'] = !scanner
    ? 'unconfigured'
    : socketApiKeySet
      ? 'authenticated'
      : 'free';

  return {
    bunfigPath: resolvedBunfig,
    bunfigExists: exists,
    scanner,
    frozenLockfile,
    exact,
    saveTextLockfile,
    socketApiKeySet,
    socketApiKeyPassRef: SOCKET_API_KEY_PASS_REF,
    scannerInPackageJson,
    scannerInNodeModules,
    socketInEnvTemplate,
    socketInVaultMap,
    socketRefsAligned,
    mode,
  };
}

export type DoctorCheckLevel = 'fatal' | 'warn' | 'info';
export type DoctorCheck = {
  id: string;
  level: DoctorCheckLevel;
  ok: boolean;
  message: string;
};

export type DoctorReport = {
  kind: 'portal-cli-scanner-doctor';
  ok: boolean;
  strict: boolean;
  mode: InstallSecurityStatus['mode'];
  status: InstallSecurityStatus;
  checks: DoctorCheck[];
};

/** Pure readiness checklist from status (no I/O). */
export function buildDoctorChecks(s: InstallSecurityStatus): DoctorCheck[] {
  // Prefer package present + install-time OFF (quota). On-demand: scan --oneshot.
  const socketPkgReady = s.scannerInPackageJson || s.scannerInNodeModules;

  const checks: DoctorCheck[] = [
    {
      id: 'bunfig-exists',
      level: 'fatal',
      ok: s.bunfigExists,
      message: s.bunfigExists
        ? `bunfig present: ${s.bunfigPath}`
        : `bunfig missing: ${s.bunfigPath}`,
    },
    {
      id: 'scanner-package',
      level: 'fatal',
      ok: socketPkgReady || Boolean(s.scanner),
      message: socketPkgReady
        ? `scanner package available (${SOCKET_SCANNER_PACKAGE} or configured)`
        : s.scanner
          ? `scanner "${s.scanner}" configured but package missing from package.json/node_modules`
          : `install ${SOCKET_SCANNER_PACKAGE} (devDep) for on-demand --oneshot scans`,
    },
    {
      id: 'install-time-scanner',
      level: 'info',
      ok: true,
      message: s.scanner
        ? `[install.security] ON = "${s.scanner}" (every bun install hits Socket API — high quota cost)`
        : 'install-time scanner OFF (quota-safe; use scan --oneshot --force)',
    },
    {
      id: 'scanner-in-package-json',
      level: 'warn',
      ok: socketPkgReady || !s.scanner,
      message: s.scannerInPackageJson
        ? `package.json lists scanner package`
        : s.scanner
          ? `package.json missing configured scanner (run: portal-cli scanner install ${s.scanner})`
          : `prefer package.json devDependency ${SOCKET_SCANNER_PACKAGE}`,
    },
    {
      id: 'scanner-in-node-modules',
      level: 'warn',
      ok: s.scannerInNodeModules || !s.scannerInPackageJson,
      message: s.scannerInNodeModules
        ? `node_modules has scanner package`
        : 'node_modules missing scanner (bun install)',
    },
    {
      id: 'socket-api-key',
      level: 'info',
      ok: true, // free mode is valid
      message: s.socketApiKeySet
        ? 'SOCKET_API_KEY set (authenticated / org mode)'
        : 'SOCKET_API_KEY unset (Socket free mode — optional)',
    },
    {
      id: 'env-template-socket',
      level: 'warn',
      ok: s.socketInEnvTemplate,
      message: s.socketInEnvTemplate
        ? `env.template wires ${SOCKET_API_KEY_ENV}`
        : `env.template missing ${SOCKET_API_KEY_ENV} pass:// ref`,
    },
    {
      id: 'vault-map-socket',
      level: 'warn',
      ok: s.socketInVaultMap,
      message: s.socketInVaultMap
        ? `vault-map has [env.${SOCKET_API_KEY_ENV}]`
        : `vault-map missing [env.${SOCKET_API_KEY_ENV}]`,
    },
    {
      id: 'socket-refs-aligned',
      level: 'warn',
      ok: s.socketRefsAligned,
      message: s.socketRefsAligned
        ? `pass refs aligned → ${s.socketApiKeyPassRef}`
        : 'env.template / vault-map / canonical pass refs disagree',
    },
  ];
  return checks;
}

export function evaluateDoctor(
  s: InstallSecurityStatus,
  opts: { strict?: boolean } = {}
): DoctorReport {
  const checks = buildDoctorChecks(s);
  const strict = Boolean(opts.strict);
  const failed = checks.filter(c => {
    if (c.ok) return false;
    if (c.level === 'fatal') return true;
    if (strict && c.level === 'warn') return true;
    return false;
  });
  return {
    kind: 'portal-cli-scanner-doctor',
    ok: failed.length === 0,
    strict,
    mode: s.mode,
    status: s,
    checks,
  };
}

export function formatDoctorReport(r: DoctorReport): string {
  const lines: string[] = [
    `Bun Security Scanner doctor  mode=${r.mode}  ${r.ok ? 'OK' : 'FAIL'}${r.strict ? ' (strict)' : ''}`,
    '',
  ];
  for (const c of r.checks) {
    const mark = c.ok ? '✓' : c.level === 'info' ? '·' : '✗';
    lines.push(`  ${mark} [${c.level}] ${c.id}: ${c.message}`);
  }
  lines.push('');
  if (!r.status.scanner) {
    lines.push(
      'Next: portal-cli scanner install @socketsecurity/bun-security-scanner',
      '      portal-cli scanner configure @socketsecurity/bun-security-scanner --write'
    );
  } else if (!r.status.socketApiKeySet) {
    lines.push(
      'Optional org mode (packages scope token):',
      `  portal-cli scanner vault   # Pass item create recipe`,
      `  # then: portal-cli secret inject -i env.template -o .env -f`
    );
  } else {
    lines.push('Ready: portal-cli scanner scan');
  }
  lines.push('', `Docs: ${SECURITY_SCANNER_DOCS}`);
  return lines.join('\n');
}

/** Human vault wiring + pass-cli create recipe (no secrets). */
export function formatScannerVaultHelp(): string {
  return `Socket API key vault wiring (no secret values)

Env:      ${SOCKET_API_KEY_ENV}
Pass ref: ${SOCKET_API_KEY_PASS_REF}
Vault:    ${SOCKET_API_KEY_VAULT}
Item:     ${SOCKET_API_KEY_ITEM}
Field:    ${SOCKET_API_KEY_FIELD}
Map:      config/vault-map.toml [env.${SOCKET_API_KEY_ENV}]
Template: env.template

Mint token: https://socket.dev  (API tokens · scope: packages)
Scanner:    ${SOCKET_SCANNER_PACKAGE}  (bunfig [install.security])

Create Pass login item (after agent session works):
  source scripts/agent-env.sh factorywager
  pass-cli item create login \\
    --vault-name ${SOCKET_API_KEY_VAULT} \\
    --title "${SOCKET_API_KEY_ITEM}" \\
    --password '<paste Socket packages-scope token>' \\
    --url https://socket.dev

Inject (never commit .env):
  bun run portal-cli secret inject -i env.template -o .env -f
  bun run portal-cli scanner doctor
  bun run portal-cli scanner scan

Free mode works without ${SOCKET_API_KEY_ENV}; doctor marks it as info.
`;
}

/**
 * Pure text transform: set or replace `[install.security] scanner = "…"`.
 * Preserves surrounding bunfig content; does not re-serialize whole file.
 */
export function setInstallSecurityScanner(text: string, packageName: string): string {
  const pkg = packageName.trim();
  if (!isValidScannerPackageName(pkg)) {
    throw new Error(
      `Invalid scanner package name: ${packageName}\n` +
        `Expected npm name (@scope/name) or local path (./scanner).`
    );
  }
  // Escape for TOML basic string
  const escaped = pkg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const block = `[install.security]\nscanner = "${escaped}"\n`;

  // Only match real table headers at line start (not `# #[install.security]` comments)
  const headerRe = /^\[install\.security\]\s*$/im;
  const scannerLineRe = /^scanner\s*=\s*(?:"[^"]*"|'[^']*'|[^\n#]+)\s*$/im;

  if (headerRe.test(text)) {
    // Replace first live scanner assignment after the header, or insert after header
    const lines = text.split(/\r?\n/);
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\[install\.security\]\s*$/i.test(lines[i]!)) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx >= 0) {
      let replaced = false;
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const L = lines[i]!;
        if (L.startsWith('[')) break; // next table
        if (scannerLineRe.test(L)) {
          lines[i] = `scanner = "${escaped}"`;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        lines.splice(headerIdx + 1, 0, `scanner = "${escaped}"`);
      }
      return lines.join('\n');
    }
  }

  // Append new section (with leading newline if file non-empty)
  const trimmed = text.replace(/\s*$/, '');
  const nl = trimmed.length ? '\n\n' : '';
  return (
    trimmed +
    nl +
    `# Bun Security Scanner — https://bun.com/docs/pm/security-scanner-api\n` +
    `# Scanners export: { version: "1", scan({ packages }) => Advisory[] }\n` +
    block
  );
}

/**
 * Pure text transform: remove scanner key; drop empty [install.security] table.
 */
export function clearInstallSecurityScanner(text: string): string {
  // Only touch real `[install.security]` tables (line-start), not commented docs.
  if (!/^\[install\.security\]\s*$/im.test(text)) return text;

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inSec = false;
  let secBuf: string[] = [];

  const flushSec = () => {
    // Keep section only if non-scanner live keys remain
    const kept = secBuf.filter(l => {
      const t = l.trim();
      if (!t) return true; // preserve blank structure if we keep section
      if (t.startsWith('#')) return true;
      if (/^\[install\.security\]$/i.test(t)) return true;
      if (/^scanner\s*=/.test(t)) return false;
      return true;
    });
    const liveKeys = kept.filter(l => {
      const t = l.trim();
      return t && !t.startsWith('#') && !/^\[install\.security\]$/i.test(t);
    });
    if (liveKeys.length > 0) {
      out.push(...kept);
    }
    // else drop entire section (quota-safe default: no install-time scanner)
    secBuf = [];
    inSec = false;
  };

  for (const L of lines) {
    if (/^\[install\.security\]\s*$/i.test(L)) {
      if (inSec) flushSec();
      inSec = true;
      secBuf = [L];
      continue;
    }
    if (inSec) {
      if (L.startsWith('[')) {
        flushSec();
        out.push(L);
      } else {
        secBuf.push(L);
      }
      continue;
    }
    out.push(L);
  }
  if (inSec) flushSec();

  let next = out.join('\n');
  // Drop orphaned security comment banners left empty
  next = next.replace(
    /\n*#\s*Bun Security Scanner[^\n]*\n(?:#\s*Scanners export[^\n]*\n)?(?=\n|\s*$)/gi,
    '\n'
  );
  return next.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '\n');
}

export function formatScannerStatus(s: InstallSecurityStatus): string {
  const keyLine = s.socketApiKeySet
    ? 'set (org / authenticated mode)'
    : 'unset (Socket free mode — optional)';
  const lines: string[] = [
    'Bun Security Scanner status',
    `  mode:            ${s.mode}`,
    `  bunfig:          ${s.bunfigPath}${s.bunfigExists ? '' : ' (missing)'}`,
    `  scanner:         ${s.scanner ?? '(not configured)'}`,
    `  package.json:    ${s.scanner ? (s.scannerInPackageJson ? 'listed' : 'missing') : '—'}`,
    `  node_modules:    ${s.scanner ? (s.scannerInNodeModules ? 'present' : 'missing') : '—'}`,
    `  frozenLockfile:  ${s.frozenLockfile === undefined ? '—' : String(s.frozenLockfile)}`,
    `  exact:           ${s.exact === undefined ? '—' : String(s.exact)}`,
    `  SOCKET_API_KEY:  ${keyLine}`,
    `  vault ref:       ${s.socketApiKeyPassRef}`,
    `  env.template:    ${s.socketInEnvTemplate ? 'wired' : 'missing'}`,
    `  vault-map:       ${s.socketInVaultMap ? 'wired' : 'missing'}`,
    `  refs aligned:    ${s.socketRefsAligned ? 'yes' : 'NO'}`,
    '',
    `Docs: ${SECURITY_SCANNER_DOCS}`,
    `bunfig: ${SECURITY_SCANNER_BUNFIG}`,
  ];
  if (!s.scanner) {
    lines.push(
      '',
      'No scanner configured. `bun pm scan` will exit until you set one:',
      `  portal-cli scanner install ${SOCKET_SCANNER_PACKAGE}`,
      `  portal-cli scanner configure ${SOCKET_SCANNER_PACKAGE} --write`,
      '  portal-cli scanner init [dir]      # clone official template',
      '',
      'Note: docs example "@oven/bun-security-scanner" is not a real package.',
      `Real Socket package: ${SOCKET_SCANNER_PACKAGE}`,
      `Template: ${SECURITY_SCANNER_TEMPLATE}`
    );
  } else {
    lines.push(
      '',
      'Run: portal-cli scanner scan     # → bun pm scan',
      '     portal-cli scanner doctor   # readiness checklist'
    );
  }
  if (!s.socketApiKeySet) {
    lines.push(
      '',
      'Optional org mode: mint Socket API token (packages scope) → vault item, inject:',
      `  portal-cli scanner vault`,
      `  ${s.socketApiKeyPassRef}`,
      '  bun run portal-cli secret inject -i env.template -o .env -f',
      '  # or: export SOCKET_API_KEY=…'
    );
  }
  if (s.frozenLockfile) {
    lines.push(
      '',
      'This workspace has install.frozenLockfile = true.',
      '  bun add -d <scanner> needs a temporary unfreeze (or intentional dep PR).'
    );
  }
  return lines.join('\n');
}

export const SCANNER_HELP = `Usage: portal-cli scanner <subcommand> [options]

Grounded Bun Security Scanner control plane — no invented packages/APIs.
Docs: ${SECURITY_SCANNER_DOCS}
Real Socket package: ${SOCKET_SCANNER_PACKAGE}

Quota-safe defaults (monorepo ≈ hundreds of lockfile packages):
  · Install-time scanner OFF by default (every bun install would re-hit Socket free API)
  · On-demand scan cooldown ${DEFAULT_SCAN_COOLDOWN_HOURS}h (override: ${SCAN_COOLDOWN_ENV}=N, or --force)
  · Prefer free mode (no SOCKET_API_KEY in .env) unless org token has packages:list
  · Alternate CVE path: bun audit (npm registry — no Socket quota)

Subcommands:
  status [--json]        Show bunfig + vault wiring + package presence (default)
  doctor [--strict] [--json]
                         Readiness checklist (fatal fails exit 1; --strict fails on warns)
  policy [--json]        Bun install SSOT + Socket quota policy
  estimate [--json]      Lockfile package count (no API calls)
  vault                  Pass ref + pass-cli create recipe for SOCKET_API_KEY
  scan [--force]         Run \`bun pm scan\` (cooldown unless --force; needs scanner in bunfig)
  configure <pkg>        Preview / write install-time scanner into bunfig.toml
                         --write   apply (default is dry-run preview)
                         --bunfig <path>  (default: bunfig.toml)
  clear                  Preview / remove install-time scanner from bunfig.toml
                         --write   apply
  install <pkg>          bun add -d <pkg> (does not auto-unfreeze lockfile)
  init [dir]             git clone official scanner template
                         (default dir: ${DEFAULT_INIT_DIR})
  help                   This message

Recommended flow:
  1. Keep install-time scanner OFF day-to-day (scanner clear --write)
  2. After intentional bun add / weekly: scanner configure … --write && scanner scan --force
     then scanner clear --write again  — or leave OFF and only: scanner scan --force
     (scan requires scanner package name in bunfig for bun pm scan)
  3. CI: bun run scanner:ci  (uses --force)

For one-off scan without permanent install-time config, configure just before scan:
  portal-cli scanner configure ${SOCKET_SCANNER_PACKAGE} --write
  portal-cli scanner scan --force
  portal-cli scanner clear --write

Examples:
  portal-cli scanner policy
  portal-cli scanner estimate
  portal-cli scanner scan
  portal-cli scanner scan --force
  portal-cli scanner doctor
  portal-cli scanner vault

Also: portal-cli pm scan → bun pm scan (no cooldown). Prefer portal-cli scanner scan.
`;

export type ScannerDispatchOpts = {
  bunfigPath?: string;
  cwd?: string;
  /**
   * Spawn `bun <args…>` (args already exclude the `bun` binary).
   * portal-cli wraps this with spawnBunWithFlags so execution flags apply once.
   */
  spawnBun?: (args: string[], opts?: { cwd?: string }) => Promise<number>;
  /**
   * Capturing variant of spawnBun used for `pm scan` so oneshot can detect
   * Socket quota exhaustion (HTTP 429) in the output and downgrade it to the
   * non-fatal quota path. Output is echoed through after the process exits.
   * Tests that only inject spawnBun are unaffected.
   */
  spawnBunCapture?: (
    args: string[],
    opts?: { cwd?: string }
  ) => Promise<{ code: number; output: string }>;
  /** Injected git clone for tests. */
  spawnGit?: (args: string[], opts?: { cwd?: string }) => Promise<number>;
};

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function flagValue(args: string[], name: string): string | undefined {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1]!.startsWith('-')) return args[i + 1];
  return undefined;
}

function positionals(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--write' || a === '--dry-run') continue;
    if (a === '--bunfig' || a.startsWith('--bunfig=')) {
      if (a === '--bunfig') i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    out.push(a);
  }
  return out;
}

async function defaultSpawnBun(args: string[], opts?: { cwd?: string }): Promise<number> {
  const proc = Bun.spawn(bunSpawnArgs(args), {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: { ...Bun.env },
  });
  return (await proc.exited) ?? 1;
}

async function defaultSpawnGit(args: string[], opts?: { cwd?: string }): Promise<number> {
  const proc = Bun.spawn(['git', ...args], {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return (await proc.exited) ?? 1;
}

async function defaultSpawnBunCapture(
  args: string[],
  opts?: { cwd?: string }
): Promise<{ code: number; output: string }> {
  const proc = Bun.spawn(bunSpawnArgs(args), {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
    env: { ...Bun.env },
  });
  const [stdout, stderr, exited] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return { code: exited ?? 1, output: stdout + stderr };
}

/** Socket free-tier quota exhaustion signature (HTTP 429 from the scan API). */
const SCAN_QUOTA_EXHAUSTED = /429|rate limit|too many requests|quota/i;

/**
 * Dispatch scanner subcommand. Returns process exit code (0 = ok).
 * Does not call process.exit — caller may.
 */
export async function dispatchScanner(
  sub: string | undefined,
  rest: string[],
  opts: ScannerDispatchOpts = {}
): Promise<number> {
  const bunfigPath = flagValue(rest, '--bunfig') || opts.bunfigPath || DEFAULT_BUNFIG_REL;
  const cwd = opts.cwd ?? process.cwd();
  const spawnBun = opts.spawnBun ?? defaultSpawnBun;
  // Only default the capturing spawn when spawnBun is not injected — an
  // injected spawnBun mock must stay the scan's spawn path.
  const spawnBunCapture =
    opts.spawnBunCapture ?? (opts.spawnBun ? undefined : defaultSpawnBunCapture);
  const spawnGit = opts.spawnGit ?? defaultSpawnGit;

  const cmd = !sub || sub === 'status' ? 'status' : sub;

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(SCANNER_HELP);
    return 0;
  }

  if (cmd === 'status') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    if (hasFlag(rest, '--json')) {
      jsonOut(status);
    } else {
      console.log(formatScannerStatus(status));
    }
    return 0;
  }

  if (cmd === 'doctor') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    const report = evaluateDoctor(status, { strict: hasFlag(rest, '--strict') });
    if (hasFlag(rest, '--json')) {
      jsonOut(report);
    } else {
      console.log(formatDoctorReport(report));
      if (status.scanner) {
        console.log(
          '\nquota: install-time scanner ON — every bun install/add hits Socket. Prefer clear --write day-to-day.'
        );
      }
    }
    return report.ok ? 0 : 1;
  }

  if (cmd === 'policy') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    const packageCountEstimate = await estimateLockfilePackageCount(
      `${cwd}/${DEFAULT_LOCKFILE_REL}`
    );
    const lastScan = await readScannerLastRun(`${cwd}/${SCANNER_LAST_REL}`);
    const { readLockfileInstallMeta } = await import('../../lib/docs/bun-install-linker-docs.ts');
    const { readGlobalBunfigLayers, readProjectBunfig, resolveEffectiveInstallPolicy } =
      await import('../../scripts/lib/machine-bunfig.ts');
    const lockMeta = await readLockfileInstallMeta(cwd);
    const [project, layers] = await Promise.all([
      readProjectBunfig(cwd),
      readGlobalBunfigLayers(),
    ]);
    const eff = resolveEffectiveInstallPolicy(project, layers.effective);
    const policy = buildPackageMgmtPolicy(status, {
      packageCountEstimate,
      lastScan,
      saveTextLockfile: status.saveTextLockfile,
      cooldownHours: resolveScanCooldownHours(),
      configVersion: lockMeta?.configVersion ?? null,
      lockfileVersion: lockMeta?.lockfileVersion ?? null,
      hasWorkspaces: lockMeta?.hasWorkspaces ?? false,
      expectsIsolatedDefault: lockMeta?.expectsIsolatedDefault ?? false,
      linker: eff.linker,
      globalStore: eff.globalStore,
    });
    if (hasFlag(rest, '--json')) {
      jsonOut(policy);
    } else {
      console.log(formatPackageMgmtPolicy(policy));
    }
    return 0;
  }

  if (cmd === 'estimate') {
    const n = await estimateLockfilePackageCount(`${cwd}/${DEFAULT_LOCKFILE_REL}`);
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    const payload = {
      kind: 'portal-scanner-estimate',
      packageCountEstimate: n,
      mode: status.mode,
      installTimeScanner: status.scanner ?? null,
      socketApiKeySet: status.socketApiKeySet,
      freeApiHitsIfScanned: n,
      note:
        n != null
          ? `Free-mode Socket ≈ ${n} public API requests per full scan/install-time pass.`
          : 'bun.lock not found',
    };
    if (hasFlag(rest, '--json')) {
      jsonOut(payload);
    } else {
      console.log(`Lockfile package estimate: ${n ?? '—'}`);
      console.log(`Socket free-mode API hits if scanned: ${n ?? '—'}`);
      console.log(`Mode: ${status.mode} · install-time scanner: ${status.scanner ?? '(off)'}`);
      console.log(payload.note);
      console.log('(no Socket API called)');
    }
    return 0;
  }

  if (cmd === 'vault') {
    console.log(formatScannerVaultHelp());
    return 0;
  }

  if (cmd === 'scan') {
    const force = hasFlag(rest, '--force');
    // --oneshot: temporarily set Socket scanner in bunfig, scan, clear — no lasting install-time cost
    const oneshot = hasFlag(rest, '--oneshot');
    let status = await readInstallSecurityStatus(bunfigPath, { cwd });
    let restoredBunfig: string | null = null;

    if (!status.scanner && !oneshot) {
      console.error(
        `error: no security scanner configured in ${bunfigPath}\n` +
          `  Quota-safe one-shot (no lasting install-time scanner):\n` +
          `    portal-cli scanner scan --oneshot --force\n\n` +
          `  Or leave install-time ON (costs Socket API on every bun install):\n` +
          `    portal-cli scanner configure ${SOCKET_SCANNER_PACKAGE} --write\n` +
          `    portal-cli scanner scan --force\n\n` +
          `Docs: ${SECURITY_SCANNER_DOCS}`
      );
      return 1;
    }

    const packageCountEstimate = await estimateLockfilePackageCount(
      `${cwd}/${DEFAULT_LOCKFILE_REL}`
    );
    const lastPath = `${cwd}/${SCANNER_LAST_REL}`;
    const lastScan = await readScannerLastRun(lastPath);
    const cooldownHours = resolveScanCooldownHours();
    const decision = evaluateScanCooldown(lastScan, { force, cooldownHours });

    if (decision.skip) {
      console.log(
        `scan skipped: ${decision.reason} (remaining ${formatDurationMs(decision.remainingMs)})\n` +
          `  last: ${lastScan?.at ?? '—'}\n` +
          `  packages≈ ${packageCountEstimate ?? '—'} · mode=${status.mode}\n` +
          `  re-run with --force to spend Socket quota intentionally\n` +
          `  policy: portal-cli scanner policy`
      );
      return 0;
    }

    if (oneshot) {
      const f = Bun.file(bunfigPath);
      const current = (await f.exists()) ? await f.text() : '';
      restoredBunfig = current;
      const next = setInstallSecurityScanner(current, SOCKET_SCANNER_PACKAGE);
      await Bun.write(bunfigPath, next.endsWith('\n') ? next : `${next}\n`);
      status = await readInstallSecurityStatus(bunfigPath, { cwd });
      console.log(
        `oneshot: temporarily set scanner = ${SOCKET_SCANNER_PACKAGE} (will clear after scan)\n`
      );
    }

    if (packageCountEstimate != null && packageCountEstimate > 200) {
      console.log(
        `note: ≈${packageCountEstimate} packages · free mode ≈ that many Socket free API hits\n` +
          `  mode=${status.mode} · force=${force} · oneshot=${oneshot}\n`
      );
    }

    let code = 1;
    let scanOutput = '';
    try {
      // Real command: bun pm scan (captured when possible so oneshot can
      // detect Socket quota exhaustion in the output)
      if (spawnBunCapture) {
        const r = await spawnBunCapture(['pm', 'scan'], { cwd });
        code = r.code;
        scanOutput = r.output;
      } else {
        code = await spawnBun(['pm', 'scan'], { cwd });
      }
    } finally {
      if (oneshot && restoredBunfig != null) {
        await Bun.write(
          bunfigPath,
          restoredBunfig.endsWith('\n') ? restoredBunfig : `${restoredBunfig}\n`
        );
        console.log(`oneshot: restored ${bunfigPath} (install-time scanner off again)`);
      }
    }

    // Quota path: oneshot exists to avoid install-time quota cost, so a
    // 429/rate-limit failure is non-fatal — warn and exit 0. Other scan
    // failures keep the real exit code.
    if (code !== 0 && oneshot && SCAN_QUOTA_EXHAUSTED.test(scanOutput)) {
      console.warn(
        'oneshot: Socket quota exhausted (429) — non-fatal (quota path); re-run later or authenticate'
      );
      code = 0;
    }

    await writeScannerLastRun(
      {
        kind: 'portal-scanner-last',
        schemaVersion: 1,
        at: new Date().toISOString(),
        mode: status.mode === 'unconfigured' ? 'free' : status.mode,
        exitCode: code,
        packageCountEstimate,
        force,
      },
      lastPath
    );
    return code;
  }

  if (cmd === 'configure') {
    const pos = positionals(rest);
    const pkg = pos[0];
    if (!pkg) {
      console.error('Usage: portal-cli scanner configure <package> [--write] [--bunfig path]');
      return 1;
    }
    if (!isValidScannerPackageName(pkg)) {
      console.error(`Invalid scanner package name: ${pkg}`);
      return 1;
    }
    const write = hasFlag(rest, '--write');
    const f = Bun.file(bunfigPath);
    const exists = await f.exists();
    const current = exists ? await f.text() : '';
    const next = setInstallSecurityScanner(current, pkg);
    if (!write) {
      console.log(`Dry-run: would set [install.security] scanner = "${pkg}" in ${bunfigPath}`);
      console.log('(pass --write to apply)\n');
      // Show only the security-related tail for review
      const secMatch = next.match(
        /(?:# Bun Security Scanner[\s\S]*?)?\[install\.security\][\s\S]*?(?=\n\[|$)/
      );
      console.log(secMatch?.[0]?.trim() || next.slice(-200));
      return 0;
    }
    await Bun.write(bunfigPath, next.endsWith('\n') ? next : `${next}\n`);
    console.log(`✅ Wrote [install.security] scanner = "${pkg}" → ${bunfigPath}`);
    console.log(`Next: portal-cli scanner scan`);
    return 0;
  }

  if (cmd === 'clear') {
    const write = hasFlag(rest, '--write');
    const f = Bun.file(bunfigPath);
    if (!(await f.exists())) {
      console.error(`bunfig not found: ${bunfigPath}`);
      return 1;
    }
    const current = await f.text();
    const next = clearInstallSecurityScanner(current);
    if (next === current) {
      console.log(`No [install.security] scanner in ${bunfigPath}`);
      return 0;
    }
    if (!write) {
      console.log(`Dry-run: would clear [install.security] scanner from ${bunfigPath}`);
      console.log('(pass --write to apply)');
      return 0;
    }
    await Bun.write(bunfigPath, next.endsWith('\n') ? next : `${next}\n`);
    console.log(`✅ Cleared security scanner from ${bunfigPath}`);
    return 0;
  }

  if (cmd === 'install') {
    const pos = positionals(rest);
    const pkg = pos[0];
    if (!pkg) {
      console.error('Usage: portal-cli scanner install <package>');
      console.error('  → bun add -d <package>');
      console.error('  Docs example names are placeholders — use a real scanner package.');
      return 1;
    }
    if (!isValidScannerPackageName(pkg)) {
      console.error(`Invalid package name: ${pkg}`);
      return 1;
    }
    const status = await readInstallSecurityStatus(bunfigPath);
    if (status.frozenLockfile) {
      console.log(
        `note: ${bunfigPath} has frozenLockfile = true — bun add may fail until unfrozen.\n` +
          `  Intentional dep change: temporarily set frozenLockfile = false, then restore.\n`
      );
    }
    console.log(`→ bun add -d ${pkg}`);
    const code = await spawnBun(['add', '-d', pkg], { cwd });
    if (code === 0) {
      console.log(`\nInstalled. Configure with:\n  portal-cli scanner configure ${pkg} --write`);
    }
    return code;
  }

  if (cmd === 'init') {
    const pos = positionals(rest);
    const dir = pos[0] || DEFAULT_INIT_DIR;
    // refuse path traversal-ish empties
    if (!dir || dir === '.' || dir.includes('..')) {
      console.error(`Invalid init directory: ${dir}`);
      return 1;
    }
    console.log(`→ git clone ${SECURITY_SCANNER_TEMPLATE} ${dir}`);
    const code = await spawnGit(['clone', '--depth', '1', SECURITY_SCANNER_TEMPLATE, dir], { cwd });
    if (code === 0) {
      console.log(`
✅ Scanner template cloned to ${dir}

Next:
  cd ${dir} && bun install
  # implement scan() in src/ (export const scanner: Bun.Security.Scanner)
  bun test
  # publish or bun link, then:
  portal-cli scanner configure <your-package> --write
  portal-cli scanner scan

Docs: ${SECURITY_SCANNER_DOCS}
Template: ${SECURITY_SCANNER_TEMPLATE}
`);
    }
    return code;
  }

  console.error(`Unknown scanner subcommand: ${sub}\n\n${SCANNER_HELP}`);
  return 1;
}

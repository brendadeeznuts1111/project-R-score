// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/pm/security-scanner-api — Security Scanner API
// @see https://bun.com/docs/runtime/bunfig#install-security-scanner — [install.security] scanner
// @see https://bun.com/docs/pm/cli/pm — bun pm scan
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * portal-cli scanner — grounded Bun Security Scanner control plane.
 *
 * Real surface (do not invent):
 *   - Configure: bunfig.toml `[install.security] scanner = "pkg"`
 *   - One-off / lockfile scan: `bun pm scan` (requires scanner configured)
 *   - Scanner packages export `scanner: Bun.Security.Scanner` with `version: "1"`
 *     and `scan({ packages })` → `Bun.Security.Advisory[]` (fatal | warn)
 *   - Optional Socket org mode: SOCKET_API_KEY (packages scope)
 *
 * Docs example package `@oven/bun-security-scanner` is **not** a real npm package.
 * Official authoring template: https://github.com/oven-sh/security-scanner-template
 * Real Socket package: @socketsecurity/bun-security-scanner
 *
 *   portal-cli scanner status [--json]
 *   portal-cli scanner doctor [--strict] [--json]
 *   portal-cli scanner vault
 *   portal-cli scanner scan
 *   portal-cli scanner configure <pkg> --write
 *   portal-cli scanner install <pkg>
 *   portal-cli scanner init [dir]
 */

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
export const DEFAULT_INIT_DIR = 'my-security-scanner';

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
} {
  let parsed: unknown;
  try {
    parsed = Bun.TOML.parse(text);
  } catch {
    return { scanner: undefined, frozenLockfile: undefined, exact: undefined };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { scanner: undefined, frozenLockfile: undefined, exact: undefined };
  }
  const install = (parsed as Record<string, unknown>).install;
  if (!install || typeof install !== 'object') {
    return { scanner: undefined, frozenLockfile: undefined, exact: undefined };
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
  pkgJson: unknown,
  scanner: string | undefined
): boolean {
  if (!scanner || !pkgJson || typeof pkgJson !== 'object') return false;
  const p = pkgJson as Record<string, unknown>;
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
    const block = p[key];
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
  if (exists) {
    const parsed = parseInstallSecurityFromText(await f.text());
    scanner = parsed.scanner;
    frozenLockfile = parsed.frozenLockfile;
    exact = parsed.exact;
  }

  let scannerInPackageJson = false;
  const pkgFile = Bun.file(packageJsonPath);
  if (await pkgFile.exists()) {
    try {
      scannerInPackageJson = packageJsonHasScanner(await pkgFile.json(), scanner);
    } catch {
      scannerInPackageJson = false;
    }
  }

  let scannerInNodeModules = false;
  if (scanner) {
    // scoped packages: @scope/name → node_modules/@scope/name/package.json
    const nm = `${cwd}/node_modules/${scanner}/package.json`;
    scannerInNodeModules = await Bun.file(nm).exists();
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

  const refs = [templatePassRef, mapPassRef, SOCKET_API_KEY_PASS_REF].filter(
    (r): r is string => Boolean(r)
  );
  const socketRefsAligned =
    refs.length === 0 ? true : refs.every(r => r === refs[0]);

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
      id: 'scanner-configured',
      level: 'fatal',
      ok: Boolean(s.scanner),
      message: s.scanner
        ? `[install.security] scanner = "${s.scanner}"`
        : 'no [install.security] scanner configured',
    },
    {
      id: 'scanner-in-package-json',
      level: 'warn',
      ok: !s.scanner || s.scannerInPackageJson,
      message: !s.scanner
        ? 'skip package.json (no scanner)'
        : s.scannerInPackageJson
          ? `package.json lists ${s.scanner}`
          : `package.json missing ${s.scanner} (run: portal-cli scanner install ${s.scanner})`,
    },
    {
      id: 'scanner-in-node-modules',
      level: 'warn',
      ok: !s.scanner || s.scannerInNodeModules,
      message: !s.scanner
        ? 'skip node_modules (no scanner)'
        : s.scannerInNodeModules
          ? `node_modules has ${s.scanner}`
          : `node_modules missing ${s.scanner} (bun install)`,
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

  // Replace existing scanner = "…" under [install.security]
  const sectionRe = /(\[install\.security\][^[]*?)(\nscanner\s*=\s*(?:"[^"]*"|'[^']*'|[^\n#]+))/is;
  if (sectionRe.test(text)) {
    return text.replace(sectionRe, `$1\nscanner = "${escaped}"`);
  }

  // Section exists but no scanner key — append key after header
  if (/\[install\.security\]/i.test(text)) {
    return text.replace(/(\[install\.security\])/i, `$1\nscanner = "${escaped}"`);
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
  if (!/\[install\.security\]/i.test(text)) return text;

  // Remove scanner assignment lines inside the section (best-effort)
  let next = text.replace(
    /(\[install\.security\][^[]*?)\nscanner\s*=\s*(?:"[^"]*"|'[^']*'|[^\n#]+)[^\n]*/gi,
    '$1'
  );

  // If section is now only header (+ blank/comment lines until next table), drop it
  next = next.replace(
    /\n*#\s*Bun Security Scanner[^\n]*\n(?:#\s*Scanners export[^\n]*\n)?\[install\.security\]\s*(?:\n(?:\s*|#.*))*?(?=\n\[|\s*$)/gi,
    '\n'
  );
  // Bare empty [install.security] with optional trailing blanks
  next = next.replace(/\n*\[install\.security\]\s*(?:\n\s*)*(?=\n\[|\s*$)/gi, '\n');
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

Subcommands:
  status [--json]        Show bunfig + vault wiring + package presence (default)
  doctor [--strict] [--json]
                         Readiness checklist (fatal fails exit 1; --strict fails on warns)
  vault                  Pass ref + pass-cli create recipe for SOCKET_API_KEY
  scan                   Run \`bun pm scan\` (requires scanner configured)
  configure <pkg>        Preview / write scanner into bunfig.toml
                         --write   apply (default is dry-run preview)
                         --bunfig <path>  (default: bunfig.toml)
  clear                  Preview / remove scanner from bunfig.toml
                         --write   apply
  install <pkg>          bun add -d <pkg> (does not auto-unfreeze lockfile)
  init [dir]             git clone official scanner template
                         (default dir: ${DEFAULT_INIT_DIR})
  help                   This message

Real mechanics:
  1. Install a scanner package (or author from template)
  2. Set bunfig:  [install.security]
                  scanner = "your-package"
  3. bun install / bun add run the scanner; one-off: bun pm scan
  4. Optional: SOCKET_API_KEY via Pass inject for Socket org mode

Scanner package export shape (template):
  export const scanner: Bun.Security.Scanner = {
    version: "1",
    async scan({ packages }) { return advisories; }  // level: fatal | warn
  };

Advisories:
  fatal  — install stops immediately
  warn   — TTY prompts; CI/non-TTY cancels

Examples:
  portal-cli scanner status
  portal-cli scanner status --json
  portal-cli scanner doctor
  portal-cli scanner doctor --strict
  portal-cli scanner vault
  portal-cli scanner configure ${SOCKET_SCANNER_PACKAGE} --write
  portal-cli scanner install ${SOCKET_SCANNER_PACKAGE}
  portal-cli scanner scan
  portal-cli scanner init my-org-scanner
  portal-cli scanner clear --write

Also available via passthrough: portal-cli pm scan  →  bun pm scan
`;

export type ScannerDispatchOpts = {
  bunfigPath?: string;
  cwd?: string;
  /**
   * Spawn `bun <args…>` (args already exclude the `bun` binary).
   * portal-cli wraps this with spawnBunWithFlags so execution flags apply once.
   */
  spawnBun?: (args: string[], opts?: { cwd?: string }) => Promise<number>;
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
  const proc = Bun.spawn(['bun', ...args], {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
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
  const spawnGit = opts.spawnGit ?? defaultSpawnGit;

  const cmd = !sub || sub === 'status' ? 'status' : sub;

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(SCANNER_HELP);
    return 0;
  }

  if (cmd === 'status') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    if (hasFlag(rest, '--json')) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(formatScannerStatus(status));
    }
    return 0;
  }

  if (cmd === 'doctor') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    const report = evaluateDoctor(status, { strict: hasFlag(rest, '--strict') });
    if (hasFlag(rest, '--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatDoctorReport(report));
    }
    return report.ok ? 0 : 1;
  }

  if (cmd === 'vault') {
    console.log(formatScannerVaultHelp());
    return 0;
  }

  if (cmd === 'scan') {
    const status = await readInstallSecurityStatus(bunfigPath, { cwd });
    if (!status.scanner) {
      console.error(
        `error: no security scanner configured in ${bunfigPath}\n` +
          `  [install.security]\n  scanner = "package_name"\n\n` +
          `  portal-cli scanner configure <pkg> --write\n` +
          `Docs: ${SECURITY_SCANNER_DOCS}`
      );
      return 1;
    }
    // Real command: bun pm scan
    return spawnBun(['pm', 'scan'], { cwd });
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

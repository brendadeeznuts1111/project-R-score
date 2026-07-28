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
 *
 * Docs example package `@oven/bun-security-scanner` is **not** a real npm package.
 * Official authoring template: https://github.com/oven-sh/security-scanner-template
 *
 *   portal-cli scanner status
 *   portal-cli scanner scan
 *   portal-cli scanner configure <pkg> --write
 *   portal-cli scanner install <pkg>
 *   portal-cli scanner init [dir]
 */

export const SECURITY_SCANNER_DOCS = 'https://bun.com/docs/pm/security-scanner-api';
export const SECURITY_SCANNER_BUNFIG =
  'https://bun.com/docs/runtime/bunfig#install-security-scanner';
export const SECURITY_SCANNER_TEMPLATE = 'https://github.com/oven-sh/security-scanner-template';
export const DEFAULT_BUNFIG_REL = 'bunfig.toml';
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

/** Load status from a bunfig path (repo root default). */
export async function readInstallSecurityStatus(
  bunfigPath: string = DEFAULT_BUNFIG_REL
): Promise<InstallSecurityStatus> {
  const f = Bun.file(bunfigPath);
  const exists = await f.exists();
  if (!exists) {
    return {
      bunfigPath,
      bunfigExists: false,
      scanner: undefined,
      frozenLockfile: undefined,
      exact: undefined,
    };
  }
  const text = await f.text();
  const parsed = parseInstallSecurityFromText(text);
  return {
    bunfigPath,
    bunfigExists: true,
    scanner: parsed.scanner,
    frozenLockfile: parsed.frozenLockfile,
    exact: parsed.exact,
  };
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
  const lines: string[] = [
    'Bun Security Scanner status',
    `  bunfig:          ${s.bunfigPath}${s.bunfigExists ? '' : ' (missing)'}`,
    `  scanner:         ${s.scanner ?? '(not configured)'}`,
    `  frozenLockfile:  ${s.frozenLockfile === undefined ? '—' : String(s.frozenLockfile)}`,
    `  exact:           ${s.exact === undefined ? '—' : String(s.exact)}`,
    '',
    `Docs: ${SECURITY_SCANNER_DOCS}`,
    `bunfig: ${SECURITY_SCANNER_BUNFIG}`,
  ];
  if (!s.scanner) {
    lines.push(
      '',
      'No scanner configured. `bun pm scan` will exit until you set one:',
      '  portal-cli scanner install <pkg>   # bun add -d (watch frozenLockfile)',
      '  portal-cli scanner configure <pkg> --write',
      '  portal-cli scanner init [dir]      # clone official template',
      '',
      'Note: docs example "@oven/bun-security-scanner" is not a real package.',
      `Template: ${SECURITY_SCANNER_TEMPLATE}`
    );
  } else {
    lines.push('', 'Run: portal-cli scanner scan   # → bun pm scan');
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

Subcommands:
  status                 Show [install.security] scanner from bunfig.toml (default)
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
  portal-cli scanner configure @acme/bun-security-scanner
  portal-cli scanner configure @acme/bun-security-scanner --write
  portal-cli scanner install @acme/bun-security-scanner
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
    const status = await readInstallSecurityStatus(bunfigPath);
    console.log(formatScannerStatus(status));
    return 0;
  }

  if (cmd === 'scan') {
    const status = await readInstallSecurityStatus(bunfigPath);
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

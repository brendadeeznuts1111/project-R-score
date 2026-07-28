// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/bunfig#run-silent-suppress-reporting-the-command-being-run — --silent
// @see https://bun.com/docs/runtime/index#general-execution-options — bun run general flags
// @see https://bun.com/docs/runtime/watch-mode — --watch · --hot · --no-clear-screen
// @see https://bun.com/docs/runtime/debugger — --inspect · --inspect-wait · --inspect-brk
// @see https://bun.com/docs/runtime/auto-install — --prefer-offline · --install=fallback
import {
  BUN_API_REFERENCE_URL,
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
} from '../../lib/docs/bun-source-links.ts';
import { joinPath } from '../../scripts/lib/fs-bun.ts';
import catalogJson from '../../config/runtime-flags.json' with { type: 'json' };

/**
 * Parse Bun general execution options from portal-cli argv and rebuild spawn argv.
 *
 * SSOT: `config/runtime-flags.json` drives parse sets, help text, `portal flags`,
 * and doctor catalog health. Only real `bun` flags (docs/runtime).
 *
 *   bun tools/portal-cli.ts --smol vault health
 *   bun tools/portal-cli.ts --console-depth=4 probe lockfile
 *   bun tools/portal-cli.ts --bun pm ls
 */

/**
 * Bun CLI surface this row documents.
 * Shortcodes are unique only within a context — e.g. runtime `-i` ≠ `bun update -i` (--interactive).
 * @see https://bun.com/docs/pm/cli/update — update -i = interactive
 * @see https://bun.com/docs/runtime/auto-install — runtime -i ≡ --install=fallback
 */
export type RuntimeFlagContext = 'runtime' | 'update' | 'install' | 'test' | 'pm';

/** One row in config/runtime-flags.json (schema v2 optional fields). */
export type RuntimeFlagEntry = {
  flag: string;
  shortcode?: string;
  category: string;
  version: string;
  description: string;
  url: string;
  takesValue?: boolean;
  default?: string | null;
  deprecated?: boolean;
  behavior?: string;
  /** Value shown in curated help as `--flag=example` (e.g. install → fallback). */
  helpExample?: string;
  /** When true, appears in BUN_FLAGS_HELP and default `portal flags` table. */
  curated?: boolean;
  /**
   * CLI surface for shortcode uniqueness + parity (default: runtime).
   * portal-cli harvest only uses context=runtime rows.
   */
  context?: RuntimeFlagContext;
  /**
   * Documented equivalent (e.g. runtime `-i` → `--install=fallback`).
   * Not necessarily another catalog primary flag.
   */
  equivalentTo?: string;
};

export const RUNTIME_FLAGS_CATALOG_PATH = 'config/runtime-flags.json';
export const DEFAULT_RUNTIME_FLAG_CONTEXT: RuntimeFlagContext = 'runtime';

function normalizeEntry(raw: RuntimeFlagEntry): RuntimeFlagEntry {
  return {
    ...raw,
    takesValue: Boolean(raw.takesValue),
    default: raw.default ?? null,
    deprecated: Boolean(raw.deprecated),
    curated: Boolean(raw.curated),
    context: raw.context ?? DEFAULT_RUNTIME_FLAG_CONTEXT,
  };
}

/** Token key scoped by CLI context (shortcodes are not global). */
export function flagTokenKey(context: RuntimeFlagContext | undefined, token: string): string {
  return `${context ?? DEFAULT_RUNTIME_FLAG_CONTEXT}\0${token}`;
}

/** Loaded catalog (module init). Prefer `loadRuntimeFlagsCatalog` for cwd-relative reloads in tests. */
export const RUNTIME_FLAGS: RuntimeFlagEntry[] = (catalogJson as RuntimeFlagEntry[]).map(
  normalizeEntry
);

/** Resolve catalog path relative to cwd or this package. */
export function runtimeFlagsCatalogPath(cwd?: string): string {
  return cwd
    ? joinPath(cwd, RUNTIME_FLAGS_CATALOG_PATH)
    : joinPath(import.meta.dir, '../../', RUNTIME_FLAGS_CATALOG_PATH);
}

export type RuntimeFlagsCatalogLoad =
  | { ok: true; catalog: RuntimeFlagEntry[]; path: string }
  | { ok: false; error: string; path: string; catalog: RuntimeFlagEntry[] };

/**
 * Load catalog from disk with structured error (doctor schema check).
 * On failure, `catalog` falls back to the embedded import so help still works.
 */
export async function tryLoadRuntimeFlagsCatalog(cwd?: string): Promise<RuntimeFlagsCatalogLoad> {
  const path = runtimeFlagsCatalogPath(cwd);
  try {
    if (!(await Bun.file(path).exists())) {
      return {
        ok: false,
        error: `missing ${RUNTIME_FLAGS_CATALOG_PATH}`,
        path,
        catalog: RUNTIME_FLAGS,
      };
    }
    const raw = (await Bun.file(path).json()) as unknown;
    if (!Array.isArray(raw)) {
      return {
        ok: false,
        error: 'catalog root must be a JSON array',
        path,
        catalog: RUNTIME_FLAGS,
      };
    }
    return { ok: true, catalog: (raw as RuntimeFlagEntry[]).map(normalizeEntry), path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, path, catalog: RUNTIME_FLAGS };
  }
}

/**
 * Reload catalog from disk (doctor / tests). Falls back to embedded import on read error.
 */
export async function loadRuntimeFlagsCatalog(cwd?: string): Promise<RuntimeFlagEntry[]> {
  const loaded = await tryLoadRuntimeFlagsCatalog(cwd);
  return loaded.catalog;
}

/**
 * Build bool / value Sets from catalog (flag + optional shortcode).
 * Only `context: runtime` (default) rows feed portal-cli harvest.
 */
export function buildFlagSets(catalog: RuntimeFlagEntry[]): {
  boolFlags: Set<string>;
  valueFlags: Set<string>;
} {
  const boolFlags = new Set<string>();
  const valueFlags = new Set<string>();
  for (const row of catalog) {
    const ctx = row.context ?? DEFAULT_RUNTIME_FLAG_CONTEXT;
    if (ctx !== 'runtime') continue;
    const set = row.takesValue ? valueFlags : boolFlags;
    set.add(row.flag);
    if (row.shortcode) set.add(row.shortcode);
  }
  return { boolFlags, valueFlags };
}

const _sets = buildFlagSets(RUNTIME_FLAGS);

/** Boolean flags (no value). Derived from config/runtime-flags.json. */
export const BUN_BOOL_FLAGS: Set<string> = _sets.boolFlags;

/** Flags that consume the next argv token (unless --flag=value). Derived from catalog. */
export const BUN_VALUE_FLAGS: Set<string> = _sets.valueFlags;

/** portal-cli top-level commands — stop harvesting Bun flags when we hit one. */
export const PORTAL_CLI_COMMANDS = new Set([
  'snapshot',
  'probe',
  'vault',
  'capabilities',
  'capability',
  'secret',
  'badge',
  'pm',
  'scanner',
  'doctor',
  'flags',
  'bunfig',
  'dashboard',
  'help',
]);

export type BunExecutionParse = {
  /** Flags to insert after `bun` when spawning children */
  bunFlags: string[];
  /** Remaining argv for portal-cli (command + args) */
  rest: string[];
};

/**
 * Split argv into Bun runtime flags vs portal-cli command rest.
 * Harvests leading flags until a portal-cli command or non-flag positional.
 */
export function parseBunExecutionFlags(argv: string[]): BunExecutionParse {
  const bunFlags: string[] = [];
  const rest: string[] = [];
  let i = 0;
  let harvesting = true;

  while (i < argv.length) {
    const a = argv[i]!;

    if (!harvesting) {
      rest.push(a);
      i++;
      continue;
    }

    // End harvest on portal-cli command
    if (PORTAL_CLI_COMMANDS.has(a)) {
      harvesting = false;
      rest.push(a);
      i++;
      continue;
    }

    // Bare leading --help / -h is portal usage (never forward to child bun)
    if (a === '--help' || a === '-h') {
      harvesting = false;
      rest.push(a);
      i++;
      continue;
    }

    // --flag=value
    if (a.startsWith('--') && a.includes('=')) {
      const name = a.slice(0, a.indexOf('='));
      if (BUN_VALUE_FLAGS.has(name) || BUN_BOOL_FLAGS.has(name)) {
        bunFlags.push(a);
        i++;
        continue;
      }
      // unknown --x=y → portal rest
      harvesting = false;
      rest.push(a);
      i++;
      continue;
    }

    if (BUN_BOOL_FLAGS.has(a)) {
      bunFlags.push(a);
      i++;
      continue;
    }

    if (BUN_VALUE_FLAGS.has(a)) {
      bunFlags.push(a);
      i++;
      if (i < argv.length && !argv[i]!.startsWith('-')) {
        bunFlags.push(argv[i]!);
        i++;
      }
      continue;
    }

    // Unknown flag or positional → stop harvest (portal-cli owns it)
    harvesting = false;
    rest.push(a);
    i++;
  }

  return { bunFlags, rest };
}

/**
 * Build `bun <bunFlags…> <args…>` argv for Bun.spawn.
 * @param bunFlags from parseBunExecutionFlags
 * @param args e.g. ['test', 'tests/vault-health.test.ts'] or ['pm', 'ls']
 */
export function bunSpawnArgv(bunFlags: string[], args: string[]): string[] {
  return ['bun', ...bunFlags, ...args];
}

/**
 * Spawn bun with optional execution flags; inherit stdio.
 */
export async function spawnBunWithFlags(
  bunFlags: string[],
  args: string[],
  opts?: { cwd?: string }
): Promise<number> {
  const proc = Bun.spawn(bunSpawnArgv(bunFlags, args), {
    cwd: opts?.cwd ?? process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  return (await proc.exited) ?? 1;
}

/** Display form for help/table: `--install=fallback` when helpExample is set. */
export function formatFlagDisplay(row: RuntimeFlagEntry): string {
  if (row.helpExample != null && row.helpExample !== '') {
    return `${row.flag}=${row.helpExample}`;
  }
  return row.flag;
}

/** Takes-value column label. */
export function formatTakesValue(row: RuntimeFlagEntry): string {
  if (!row.takesValue) return 'No';
  if (row.helpExample) return `Yes (${row.helpExample})`;
  return 'Yes';
}

export type RuntimeFlagsCatalogHealth = {
  ok: boolean;
  total: number;
  curated: number;
  withShortcode: number;
  deprecated: number;
  valueFlags: number;
  boolFlags: number;
  /** All issue strings (schema + shortcode + help + optional parity). */
  issues: string[];
  /** Schema / required-field problems (not shortcode collisions). */
  schemaIssues: string[];
  /** Duplicate shortcodes or flag/shortcode token collisions (scoped by context). */
  shortcodeConflicts: string[];
  /** Flags with deprecated: true */
  deprecatedFlags: string[];
  /** Curated flags whose description is missing from generated help (should be empty). */
  helpCoverageMisses: string[];
  /**
   * Catalog tokens missing from live `bun --help` (runtime context only).
   * Populated only when assess opts include bunHelpText / parity result.
   */
  bunHelpMisses: string[];
};

export type AssessRuntimeFlagsOpts = {
  /** When set, compare runtime-context tokens to this `bun --help` text. */
  bunHelpText?: string;
};

/** Parse long/short flag tokens from `bun --help` output. */
export function parseBunHelpTokens(helpText: string): {
  longs: Set<string>;
  shorts: Set<string>;
} {
  const longs = new Set<string>();
  const shorts = new Set<string>();
  for (const line of helpText.split('\n')) {
    // "  -c, --config=<val>  …"
    const paired = line.match(/^\s+(-[a-zA-Z0-9]),\s+(--[a-z0-9-]+)/);
    if (paired) {
      shorts.add(paired[1]!);
      longs.add(paired[2]!);
      continue;
    }
    // "  -i                                  Auto-install…"
    const bareShort = line.match(/^\s+(-[a-zA-Z0-9])\s{2,}\S/);
    if (bareShort) {
      shorts.add(bareShort[1]!);
      continue;
    }
    // "      --watch                         …" or "      --install=<val>  …"
    const longOnly = line.match(/^\s+(--[a-z0-9-]+)(?:=<val>)?/);
    if (longOnly) longs.add(longOnly[1]!);
  }
  return { longs, shorts };
}

/**
 * Runtime-context catalog tokens that do not appear in live `bun --help`.
 * Short primary flags (e.g. `-i`) check shorts; long flags check longs; shortcodes check shorts.
 */
export function findBunHelpMisses(catalog: RuntimeFlagEntry[], helpText: string): string[] {
  const { longs, shorts } = parseBunHelpTokens(helpText);
  const misses: string[] = [];
  for (const row of catalog) {
    const ctx = row.context ?? DEFAULT_RUNTIME_FLAG_CONTEXT;
    if (ctx !== 'runtime') continue;
    const primary = row.flag.split('=')[0]!;
    if (primary.startsWith('--')) {
      if (!longs.has(primary)) misses.push(primary);
    } else if (primary.startsWith('-')) {
      if (!shorts.has(primary)) misses.push(primary);
    }
    if (row.shortcode && !shorts.has(row.shortcode)) {
      misses.push(`${row.flag} shortcode ${row.shortcode}`);
    }
  }
  return misses;
}

/** Validate catalog integrity + help coverage (doctor-style, structured). */
export function assessRuntimeFlagsCatalog(
  catalog: RuntimeFlagEntry[] = RUNTIME_FLAGS,
  opts: AssessRuntimeFlagsOpts = {}
): RuntimeFlagsCatalogHealth {
  const schemaIssues: string[] = [];
  const shortcodeConflicts: string[] = [];
  /** Within a context: primary flag names must be unique. */
  const flagSeenByContext = new Map<string, Set<string>>();
  /** context\0token → owning primary flag */
  const tokenOwner = new Map<string, string>();
  let curated = 0;
  let withShortcode = 0;
  let deprecated = 0;
  let valueFlags = 0;
  let boolFlags = 0;
  const deprecatedFlags: string[] = [];

  for (const row of catalog) {
    const ctx = row.context ?? DEFAULT_RUNTIME_FLAG_CONTEXT;
    if (!row.flag || typeof row.flag !== 'string' || !row.flag.startsWith('-')) {
      schemaIssues.push(`invalid flag name: ${JSON.stringify(row.flag)}`);
      continue;
    }

    let seen = flagSeenByContext.get(ctx);
    if (!seen) {
      seen = new Set();
      flagSeenByContext.set(ctx, seen);
    }
    if (seen.has(row.flag)) {
      schemaIssues.push(`duplicate flag in context=${ctx}: ${row.flag}`);
    }
    seen.add(row.flag);

    const primaryKey = flagTokenKey(ctx, row.flag);
    const prevPrimary = tokenOwner.get(primaryKey);
    if (prevPrimary && prevPrimary !== row.flag) {
      shortcodeConflicts.push(`context=${ctx}: ${row.flag} collides with token of ${prevPrimary}`);
    }
    tokenOwner.set(primaryKey, row.flag);

    if (row.shortcode) {
      withShortcode++;
      if (typeof row.shortcode !== 'string' || !row.shortcode.startsWith('-')) {
        schemaIssues.push(`${row.flag}: invalid shortcode ${JSON.stringify(row.shortcode)}`);
      } else if (row.shortcode === row.flag) {
        schemaIssues.push(`${row.flag}: shortcode must not equal primary flag`);
      } else {
        const sk = flagTokenKey(ctx, row.shortcode);
        const owner = tokenOwner.get(sk);
        if (owner && owner !== row.flag) {
          shortcodeConflicts.push(
            `context=${ctx}: shortcode ${row.shortcode} used by both ${owner} and ${row.flag}`
          );
        }
        tokenOwner.set(sk, row.flag);
      }
    }

    // Known false mapping: runtime -i is never --no-install
    if (ctx === 'runtime' && row.flag === '--no-install' && row.shortcode === '-i') {
      schemaIssues.push(
        '--no-install must not claim shortcode -i (runtime -i ≡ --install=fallback; update -i = --interactive)'
      );
    }

    if (!row.category || typeof row.category !== 'string') {
      schemaIssues.push(`${row.flag}: missing category`);
    }
    if (!row.description || typeof row.description !== 'string') {
      schemaIssues.push(`${row.flag}: missing description`);
    }
    if (!row.url || typeof row.url !== 'string' || !row.url.startsWith('https://')) {
      schemaIssues.push(`${row.flag}: missing/invalid url`);
    }
    if (row.version != null && typeof row.version !== 'string') {
      schemaIssues.push(`${row.flag}: version must be a string`);
    }

    if (row.curated) curated++;
    if (row.deprecated) {
      deprecated++;
      deprecatedFlags.push(row.flag);
    }
    if (row.takesValue) valueFlags++;
    else boolFlags++;
  }

  const help = buildBunFlagsHelp(catalog);
  const helpCoverageMisses: string[] = [];
  for (const row of catalog.filter(r => r.curated && !r.deprecated)) {
    const display = formatFlagDisplay(row);
    if (!help.includes(row.flag) && !help.includes(display)) {
      helpCoverageMisses.push(display);
    }
  }

  const bunHelpMisses =
    opts.bunHelpText != null ? findBunHelpMisses(catalog, opts.bunHelpText) : [];

  const issues = [
    ...schemaIssues,
    ...shortcodeConflicts,
    ...(helpCoverageMisses.length
      ? [`help missing curated flag(s): ${helpCoverageMisses.join(', ')}`]
      : []),
    ...(bunHelpMisses.length
      ? [
          `bun --help missing: ${bunHelpMisses.slice(0, 8).join(', ')}${bunHelpMisses.length > 8 ? '…' : ''}`,
        ]
      : []),
  ];

  return {
    ok: issues.length === 0,
    total: catalog.length,
    curated,
    withShortcode,
    deprecated,
    valueFlags,
    boolFlags,
    issues,
    schemaIssues,
    shortcodeConflicts,
    deprecatedFlags,
    helpCoverageMisses,
    bunHelpMisses,
  };
}

/** Fetch live `bun --help` text (for parity checks). */
export async function fetchBunHelpText(): Promise<string> {
  const proc = Bun.spawn(['bun', '--help'], { stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text;
}

/** Group catalog rows by category (stable order = first appearance). */
export function groupRuntimeFlagsByCategory(
  catalog: RuntimeFlagEntry[]
): Map<string, RuntimeFlagEntry[]> {
  const map = new Map<string, RuntimeFlagEntry[]>();
  for (const row of catalog) {
    const list = map.get(row.category) ?? [];
    list.push(row);
    map.set(row.category, list);
  }
  return map;
}

/**
 * Curated Bun runtime help for portal-cli users (generated from catalog).
 * Only `curated: true` rows appear; intentionally not every Bun flag.
 */
export function buildBunFlagsHelp(catalog: RuntimeFlagEntry[] = RUNTIME_FLAGS): string {
  const curated = catalog.filter(r => r.curated && !r.deprecated);
  const byCat = groupRuntimeFlagsByCategory(curated);
  const lines: string[] = ['Runtime options (via bun):'];

  for (const [category, rows] of byCat) {
    lines.push(`  ${category}:`);
    for (const row of rows) {
      const display = formatFlagDisplay(row);
      // Align example column roughly like the historical hand-written help
      const example = `bun ${display} tools/portal-cli.ts ...`;
      const pad = Math.max(1, 48 - example.length);
      const desc = row.description.charAt(0).toLowerCase() + row.description.slice(1);
      lines.push(`    ${example}${' '.repeat(pad)}${desc}`);
    }
  }

  lines.push('');
  lines.push('  Canonical Bun sources:');
  lines.push(`    API reference: ${BUN_API_REFERENCE_URL}`);
  lines.push(`    Type declarations: ${BUN_TYPES_SOURCE_URL}`);
  lines.push(`    Repository: ${BUN_REPOSITORY_URL}`);
  lines.push('');
  lines.push('  See all options: https://bun.com/docs/runtime/index#general-execution-options');
  lines.push('  Full portal catalog: portal-cli flags  ·  portal-cli flags --all');
  lines.push('');
  return lines.join('\n');
}

/** Lazy-generated help string (catalog-driven). */
export const BUN_FLAGS_HELP: string = buildBunFlagsHelp(RUNTIME_FLAGS);

export type FormatRuntimeFlagsTableOpts = {
  /** Include non-curated harvestable flags (default: curated only). */
  all?: boolean;
  /** Extra columns: version · default · deprecated · behavior · url */
  verbose?: boolean;
  catalog?: RuntimeFlagEntry[];
};

/**
 * Doctor-style table of runtime flags (Bun.inspect.table when available).
 */
export function formatRuntimeFlagsTable(opts: FormatRuntimeFlagsTableOpts = {}): string {
  const catalog = opts.catalog ?? RUNTIME_FLAGS;
  const rows = (opts.all ? catalog : catalog.filter(r => r.curated)).filter(
    r => !r.deprecated || opts.all
  );

  const tableRows = rows.map(r => {
    const base: Record<string, string> = {
      flag: formatFlagDisplay(r),
      shortcode: r.shortcode ?? '(none)',
      category: r.category,
      description: r.description,
      takesValue: formatTakesValue(r),
    };
    if (opts.verbose) {
      base.version = r.version;
      base.default = r.default == null ? '—' : String(r.default);
      base.deprecated = r.deprecated ? 'yes' : 'no';
      base.behavior = r.behavior ?? '—';
      base.url = r.url;
    }
    return base;
  });

  const header = opts.all
    ? `portal flags  all ${rows.length} harvestable · ${catalog.filter(r => r.curated).length} curated`
    : `portal flags  ${rows.length} curated (use --all for full harvest set)`;

  let table: string;
  try {
    const columns = opts.verbose
      ? [
          'flag',
          'shortcode',
          'category',
          'description',
          'takesValue',
          'version',
          'default',
          'deprecated',
          'behavior',
        ]
      : ['flag', 'shortcode', 'category', 'description', 'takesValue'];
    table = Bun.inspect.table(tableRows, { columns, colors: false });
  } catch {
    table = tableRows
      .map(
        r =>
          `${r.flag.padEnd(22)} ${(r.shortcode ?? '').padEnd(8)} ${r.category.padEnd(22)} ${r.description}`
      )
      .join('\n');
  }

  const footer = [
    '',
    `SSOT: ${RUNTIME_FLAGS_CATALOG_PATH}`,
    'Help: portal-cli --help  ·  Docs: https://bun.com/docs/runtime/index#general-execution-options',
  ];

  return [header, '', table, ...footer].join('\n');
}

export type RuntimeFlagsJsonReport = {
  kind: 'portal-cli-flags';
  schemaVersion: 1;
  curatedOnly: boolean;
  verbose: boolean;
  generatedAt: string;
  flags: RuntimeFlagEntry[];
  health: RuntimeFlagsCatalogHealth;
};

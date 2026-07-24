// @see https://bun.com/docs/runtime/bunfig#install-linker — --linker
/**
 * bun install page SSOT — env vars, mechanism, strategies, age gate, CI.
 * Host: bun.com (never bun.sh). Env takes priority over bunfig.toml.
 *
 * @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
 * @see https://bun.com/docs/pm/cli/install#cache
 * @see https://bun.com/docs/pm/cli/install#platform-specific-backends
 * @see https://bun.com/docs/pm/cli/install#installation-strategies
 * @see https://bun.com/docs/pm/cli/install#minimum-release-age
 * @see https://bun.com/docs/pm/cli/install#ci-cd
 * @see ../docs/UNIFIED.md
 */
import { bunDocs } from '../lib/docs/bun-site-url.ts';
import { formatCliTable, toolTableVersion } from './cli-table.ts';

/** Heading / related loci on the install page + peers. */
export const INSTALL_LOCI = {
  page: bunDocs('pm/cli/install'),
  env: bunDocs('pm/cli/install', 'configuring-with-environment-variables'),
  bunfig: bunDocs('pm/cli/install', 'configuring-bun-install-with-bunfig-toml'),
  configuration: bunDocs('pm/cli/install', 'configuration'),
  cache: bunDocs('pm/cli/install', 'cache'),
  backends: bunDocs('pm/cli/install', 'platform-specific-backends'),
  platformDependencies: bunDocs('pm/cli/install', 'platform-specific-dependencies'),
  cpuAndOs: bunDocs('pm/cli/install', 'cpu-and-os-flags'),
  strategies: bunDocs('pm/cli/install', 'installation-strategies'),
  hoisted: bunDocs('pm/cli/install', 'hoisted-installs'),
  isolated: bunDocs('pm/cli/install', 'isolated-installs'),
  defaultStrategy: bunDocs('pm/cli/install', 'default-strategy'),
  minimumReleaseAge: bunDocs('pm/cli/install', 'minimum-release-age'),
  cicd: bunDocs('pm/cli/install', 'ci-cd'),
  frozen: bunDocs('pm/cli/install', 'production-mode'),
  dryRun: bunDocs('pm/cli/install', 'dry-run'),
  lockfile: bunDocs('pm/cli/install', 'lockfile'),
  globalCache: bunDocs('pm/global-cache'),
  globalStore: bunDocs('pm/global-store'),
  policy: 'docs/UNIFIED.md',
} as const;

/** @deprecated use INSTALL_LOCI */
export const INSTALL_ENV_LOCI = INSTALL_LOCI;

/** FactoryWager machine defaults (align with docs/UNIFIED.md + ~/.bunfig.toml). */
export const FACTORY_INSTALL_DEFAULTS = {
  linker: 'isolated',
  globalStore: true,
  frozenLockfileMachine: true,
  frozenLockfileWorkspaceDev: false,
  minimumReleaseAgeSeconds: 259200,
  cacheDir: 'absolute path in ~/.bunfig.toml [install.cache].dir',
  shellEnvForbidden: ['BUN_INSTALL_CACHE_DIR', 'BUN_INSTALL_GLOBAL_STORE'] as const,
} as const;

/** Official BUN_CONFIG_* table. Env > bunfig. */
export const BUN_CONFIG_INSTALL_VARS = [
  {
    name: 'BUN_CONFIG_REGISTRY',
    description: 'Set an npm registry (default: https://registry.npmjs.org)',
  },
  {
    name: 'BUN_CONFIG_TOKEN',
    description: 'Set an auth token for the default registry',
  },
  {
    name: 'BUN_CONFIG_YARN_LOCKFILE',
    description: 'Save a Yarn v1-style yarn.lock',
  },
  {
    name: 'BUN_CONFIG_SKIP_SAVE_LOCKFILE',
    description: "Don't save a lockfile",
  },
  {
    name: 'BUN_CONFIG_SKIP_LOAD_LOCKFILE',
    description: "Don't load a lockfile",
  },
  {
    name: 'BUN_CONFIG_SKIP_INSTALL_PACKAGES',
    description: "Don't install any packages",
  },
] as const;

export type InstallNoteGroup = 'mechanism' | 'strategies' | 'age' | 'config';

export type InstallNote = {
  id: string; // brand-ok — static documentation entry key
  group: InstallNoteGroup;
  summary: string;
  docs: string;
  /** Browser text-fragment deep link (always bun.com). */
  textFragment?: string;
  /** Extra suggest aliases */
  aliases?: readonly string[];
};

/** Text-fragment helper — encode once, host always bun.com. */
function frag(start: string, end?: string): string {
  const base = 'https://bun.com/docs/pm/cli/install';
  const s = encodeURIComponent(start);
  if (!end) return `${base}#:~:text=${s}`;
  return `${base}#:~:text=${s},${encodeURIComponent(end)}`;
}

/** Mechanism notes (env section + backends/cache). */
export const INSTALL_MECHANISM_NOTES: readonly InstallNote[] = [
  {
    id: 'backend',
    group: 'mechanism',
    summary:
      'Fastest backend: clonefile (macOS) / hardlink (Linux); --backend overrides; falls back to platform copy.',
    docs: INSTALL_LOCI.backends,
    textFragment: frag('Bun uses the fastest installation method available on the target platform'),
    aliases: ['--backend', 'clonefile', 'hardlink', 'bun install backends'],
  },
  {
    id: 'cache-layout',
    group: 'mechanism',
    summary:
      'npm packages at ~/.bun/install/cache/${name}@${version}; build/pre tags replaced with a hash (shorter paths; harder to find by eye).',
    docs: INSTALL_LOCI.cache,
    // Exact browser highlight from docs (bun.com — not bun.sh)
    textFragment:
      'https://bun.com/docs/pm/cli/install#:~:text=~/.bun/install/cache/%24%7Bname%7D%40%24%7Bversion%7D.%20If%20the%20semver%20version%20has%20a%20build%20or%20a%20pre%20tag%2C%20Bun%20replaces%20it%20with%20a%20hash%20of%20that%20value.%20This%20reduces%20the%20chances%20of%20errors%20from%20long%20file%20paths%2C%20but%20complicates%20figuring%20out%20where%20a%20package%20was%20installed%20on%20disk.',
    aliases: [
      'bun install cache',
      'bun install cache layout',
      'BUN_INSTALL_CACHE_DIR',
      'install.cache',
    ],
  },
  {
    id: 'node-modules-check',
    group: 'mechanism',
    summary:
      'If node_modules exists, Bun checks package.json "name" + "version" at the expected path; custom JSON parser stops when both keys are found.',
    docs: INSTALL_LOCI.env,
    textFragment: frag('When the node_modules', '"version".'),
    aliases: ['bun install node_modules check', 'bun install name version'],
  },
  {
    id: 'eager-resolve',
    group: 'mechanism',
    summary:
      'No bun.lock, or package.json dependencies changed → download and extract tarballs eagerly while resolving.',
    docs: INSTALL_LOCI.env,
    textFragment: frag(
      "When a bun.lock doesn't exist or package.json has changed dependencies",
      'eagerly while resolving.'
    ),
    aliases: ['eager-vs-lazy'],
  },
  {
    id: 'lazy-resolve',
    group: 'mechanism',
    summary:
      'bun.lock present and package.json unchanged → lazy download; skip tarball if matching name+version already in node_modules.',
    docs: INSTALL_LOCI.env,
    textFragment: frag(
      "When a bun.lock exists and package.json hasn't changed",
      "won't attempt to download the tarball."
    ),
  },
];

/** Linker / strategy notes. */
export const INSTALL_STRATEGY_NOTES: readonly InstallNote[] = [
  {
    id: 'hoisted',
    group: 'strategies',
    summary:
      'Hoisted: flatten into shared node_modules (npm/Yarn style). bun install --linker hoisted',
    docs: INSTALL_LOCI.hoisted,
    aliases: ['hoisted-installs'],
  },
  {
    id: 'isolated',
    group: 'strategies',
    summary:
      'Isolated: pnpm-like store in node_modules/.bun/ + symlinks; blocks phantom deps. bun install --linker isolated',
    docs: INSTALL_LOCI.isolated,
    aliases: ['isolated-installs', '--linker'],
  },
  {
    id: 'default-strategy',
    group: 'strategies',
    summary:
      'Default: new workspaces → isolated; new single-package → hoisted; pre-v1.3.2 projects → hoisted (lockfile configVersion).',
    docs: INSTALL_LOCI.defaultStrategy,
    aliases: ['installation-strategies'],
  },
];

/** Supply-chain age gate. */
export const INSTALL_AGE_NOTES: readonly InstallNote[] = [
  {
    id: 'minimum-release-age',
    group: 'age',
    summary:
      'minimumReleaseAge (seconds) filters newly resolved versions younger than the threshold; lockfile pins unchanged. Machine pin: 259200 (3d).',
    docs: INSTALL_LOCI.minimumReleaseAge,
    aliases: ['minimumReleaseAge', '--minimum-release-age'],
  },
  {
    id: 'age-stability-check',
    group: 'age',
    summary:
      'When age-gated, Bun may extend past the gate up to 7 days to skip rapid successive publishes; exact versions respect age but skip stability check.',
    docs: INSTALL_LOCI.minimumReleaseAge,
  },
];

/** bunfig discovery + CI. */
export const INSTALL_CONFIG_NOTES: readonly InstallNote[] = [
  {
    id: 'bunfig-merge',
    group: 'config',
    summary:
      'bunfig search: $XDG_CONFIG_HOME/.bunfig.toml or $HOME/.bunfig.toml, then ./bunfig.toml; both merge (project overlays machine).',
    docs: INSTALL_LOCI.bunfig,
    aliases: ['bunfig.toml', 'bun install bunfig'],
  },
  {
    id: 'frozen-lockfile',
    group: 'config',
    summary:
      'bun install --frozen-lockfile installs exact lockfile versions and errors if package.json disagrees. No BUN_CONFIG_* override.',
    docs: INSTALL_LOCI.frozen,
    aliases: ['--frozen-lockfile', 'frozenLockfile'],
  },
  {
    id: 'bun-ci',
    group: 'config',
    summary: 'bun ci — CI reproducible install; fails if package.json out of sync with lockfile.',
    docs: INSTALL_LOCI.cicd,
    aliases: ['bun ci'],
  },
  {
    id: 'dry-run',
    group: 'config',
    summary: 'bun install --dry-run — resolve without installing.',
    docs: INSTALL_LOCI.dryRun,
    aliases: ['--dry-run'],
  },
];

export const ALL_INSTALL_NOTES: readonly InstallNote[] = [
  ...INSTALL_MECHANISM_NOTES,
  ...INSTALL_STRATEGY_NOTES,
  ...INSTALL_AGE_NOTES,
  ...INSTALL_CONFIG_NOTES,
];

/**
 * FactoryWager: do not put BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE in shell.
 * Machine bunfig owns absolute [install.cache].dir + globalStore + minimumReleaseAge.
 */
export const FACTORY_INSTALL_ENV_POLICY =
  'BUN_CONFIG_* may override bunfig for registry/token/lockfile skips. Cache/store/age: machine ~/.bunfig.toml only — never shell/IDE (docs/UNIFIED.md).';

export type InstallEnvSection =
  | 'env'
  | 'mechanism'
  | 'strategies'
  | 'age'
  | 'config'
  | 'factory'
  | 'all';

function norm(q: string): string {
  return q.trim().toLowerCase();
}

/** Lookup note by id or alias (case-insensitive). */
export function lookupInstallNote(query: string): InstallNote | undefined {
  const q = norm(query);
  if (!q) return undefined;
  for (const n of ALL_INSTALL_NOTES) {
    if (norm(n.id) === q) return n;
    if (n.aliases?.some(a => norm(a) === q)) return n;
  }
  // BUN_CONFIG_* vars
  if (BUN_CONFIG_INSTALL_VARS.some(v => norm(v.name) === q)) {
    return {
      id: q,
      group: 'config',
      summary:
        BUN_CONFIG_INSTALL_VARS.find(v => norm(v.name) === q)?.description ??
        'bun install env var (env > bunfig)',
      docs: INSTALL_LOCI.env,
      aliases: ['bun install env'],
    };
  }
  if (q === 'bun install env' || q === 'configuring-with-environment-variables') {
    return {
      id: 'bun-install-env',
      group: 'config',
      summary: FACTORY_INSTALL_ENV_POLICY,
      docs: INSTALL_LOCI.env,
    };
  }
  return undefined;
}

/** Extra lines for `bun-doc-refs suggest` when a note matches. */
export function formatInstallNoteSuggest(query: string): string | null {
  const n = lookupInstallNote(query);
  if (!n) return null;
  const lines = [`  [install/${n.group}] ${n.summary}`, `  docs     ${n.docs}`];
  if (n.textFragment) lines.push(`  fragment ${n.textFragment}`);
  if (n.id !== norm(query) && n.id !== query) lines.push(`  note-id  ${n.id}`);
  lines.push(
    '  (tools/bun-install-env.ts · bun tools/bun-doc-refs.ts install-env get ' + n.id + ')'
  );
  return lines.join('\n');
}

function noteAttrs(n: InstallNote): string {
  const parts: string[] = [];
  if (n.textFragment) parts.push('frag');
  if (n.aliases?.length) parts.push(...n.aliases.slice(0, 3));
  return parts.join(',') || '—';
}

function notesTable(notes: readonly InstallNote[]): string {
  return formatCliTable(
    notes.map(n => ({
      id: n.id,
      group: n.group,
      attrs: noteAttrs(n),
      summary: n.summary,
      docs: n.docs.replace('https://bun.com/docs/', ''),
    })),
    [
      { key: 'id', header: 'ID', maxWidth: 20 },
      { key: 'group', header: 'GROUP', maxWidth: 10 },
      { key: 'attrs', header: 'ATTRS', maxWidth: 28 },
      { key: 'summary', header: 'SUMMARY', maxWidth: 44 },
      { key: 'docs', header: 'DOCS', maxWidth: 36 },
    ],
    {
      indent: '  ',
      bun: false, // BUN stamped once at command top
      cols: ['id', 'group', 'attrs', 'summary', 'docs'],
    }
  );
}

export function formatInstallEnvBlock(section: InstallEnvSection = 'all'): string {
  const lines: string[] = [
    'bun install — docs SSOT (bun.com)',
    `  BUN ${toolTableVersion()}  (runtime pin — not repeated per row)`,
    '  Precedence: CLI flags → BUN_CONFIG_* → bunfig (project overlays machine)',
    '',
  ];

  const want = (s: InstallEnvSection) => section === 'all' || section === s;
  const tableOpts = { indent: '  ' as const, bun: false as const };

  if (want('factory') || section === 'all') {
    lines.push('  Factory defaults');
    lines.push(
      formatCliTable(
        [
          { key: 'linker', value: FACTORY_INSTALL_DEFAULTS.linker },
          { key: 'globalStore', value: String(FACTORY_INSTALL_DEFAULTS.globalStore) },
          {
            key: 'minimumReleaseAge',
            value: `${FACTORY_INSTALL_DEFAULTS.minimumReleaseAgeSeconds}s (3d)`,
          },
          { key: 'cache', value: FACTORY_INSTALL_DEFAULTS.cacheDir },
          {
            key: 'neverInShell',
            value: FACTORY_INSTALL_DEFAULTS.shellEnvForbidden.join(', '),
          },
        ],
        [
          { key: 'key', header: 'KEY', maxWidth: 22 },
          { key: 'value', header: 'VALUE', maxWidth: 64 },
        ],
        { ...tableOpts, cols: ['key', 'value'] }
      ).trimEnd()
    );
    lines.push('');
  }

  if (want('env')) {
    lines.push('  BUN_CONFIG_* (env > bunfig)');
    lines.push(
      formatCliTable(
        BUN_CONFIG_INSTALL_VARS.map(v => ({
          name: v.name,
          attrs: 'env,bunfig-override',
          description: v.description,
        })),
        [
          { key: 'name', header: 'NAME', maxWidth: 34 },
          { key: 'attrs', header: 'ATTRS', maxWidth: 20 },
          { key: 'description', header: 'DESCRIPTION', maxWidth: 48 },
        ],
        { ...tableOpts, cols: ['name', 'attrs', 'description'] }
      ).trimEnd()
    );
    lines.push(`  locus  ${INSTALL_LOCI.env}`);
    lines.push('');
  }

  if (want('mechanism')) {
    lines.push('  Mechanism');
    lines.push(notesTable(INSTALL_MECHANISM_NOTES).trimEnd());
    lines.push('  ATTRS may include frag + aliases → install-env get <id> for full fragment URL');
    lines.push('');
  }
  if (want('strategies')) {
    lines.push('  Strategies');
    lines.push(notesTable(INSTALL_STRATEGY_NOTES).trimEnd());
    lines.push('');
  }
  if (want('age')) {
    lines.push('  Minimum release age');
    lines.push(notesTable(INSTALL_AGE_NOTES).trimEnd());
    lines.push('');
  }
  if (want('config')) {
    lines.push('  Config / CI');
    lines.push(notesTable(INSTALL_CONFIG_NOTES).trimEnd());
    lines.push('');
  }

  if (section === 'all') {
    lines.push('  Loci');
    lines.push(
      formatCliTable(
        [
          { key: 'page', value: INSTALL_LOCI.page },
          { key: 'env', value: INSTALL_LOCI.env },
          { key: 'cache', value: INSTALL_LOCI.cache },
          { key: 'policy', value: INSTALL_LOCI.policy },
        ],
        [
          { key: 'key', header: 'KEY', maxWidth: 10 },
          { key: 'value', header: 'URL', maxWidth: 72 },
        ],
        { indent: '  ', bun: false, cols: ['key', 'value'] }
      ).trimEnd()
    );
    lines.push('');
    lines.push('  Lookup: bun tools/bun-doc-refs.ts install-env get <id>');
    lines.push('          bun tools/bun-doc-refs.ts suggest "cache-layout"');
  }

  return `${lines.join('\n')}\n`;
}

/** Detail block for `install-env get <id>`. */
export function formatInstallNoteDetail(query: string): string | null {
  const n = lookupInstallNote(query);
  if (!n) return null;
  const rows = [
    { key: 'id', value: n.id },
    { key: 'group', value: n.group },
    { key: 'attrs', value: noteAttrs(n) },
    { key: 'summary', value: n.summary },
    { key: 'docs', value: n.docs },
  ];
  if (n.textFragment) rows.push({ key: 'fragment', value: n.textFragment });
  if (n.aliases?.length) rows.push({ key: 'aliases', value: n.aliases.join(', ') });
  return (
    `install note\n` +
    formatCliTable(
      rows,
      [
        { key: 'key', header: 'KEY', maxWidth: 10 },
        { key: 'value', header: 'VALUE', maxWidth: 96 },
      ],
      {
        bun: toolTableVersion(),
        cols: ['key', 'value'],
      }
    )
  );
}

/** JSON export for agents / api-index. */
export function installEnvSnapshot() {
  return {
    host: 'bun.com',
    loci: INSTALL_LOCI,
    factory: FACTORY_INSTALL_DEFAULTS,
    vars: BUN_CONFIG_INSTALL_VARS,
    mechanism: INSTALL_MECHANISM_NOTES,
    strategies: INSTALL_STRATEGY_NOTES,
    age: INSTALL_AGE_NOTES,
    config: INSTALL_CONFIG_NOTES,
    policy: FACTORY_INSTALL_ENV_POLICY,
    noteIds: ALL_INSTALL_NOTES.map(n => n.id),
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const json = args.includes('--json') || args.includes('-j');
  const getIdx = args.indexOf('get');
  if (getIdx !== -1) {
    const q = args
      .slice(getIdx + 1)
      .filter(a => !a.startsWith('-'))
      .join(' ');
    const detail = formatInstallNoteDetail(q);
    if (!detail) {
      console.error(`unknown install note: ${q}`);
      console.error(`known: ${ALL_INSTALL_NOTES.map(n => n.id).join(', ')}`);
      process.exit(1);
    }
    if (json) console.info(JSON.stringify(lookupInstallNote(q), null, 2));
    else console.info(detail.trimEnd());
    process.exit(0);
  }
  const arg = args.find(a => a.startsWith('--section='))?.slice('--section='.length) as
    | InstallEnvSection
    | undefined;
  if (json) console.info(JSON.stringify(installEnvSnapshot(), null, 2));
  else console.info(formatInstallEnvBlock(arg ?? 'all').trimEnd());
}

// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
/**
 * Shared CLI category SSOT for `help` and `cli:docs`.
 *
 * @see https://bun.com/docs/cli/run — package.json scripts / bun run
 */

export type CliCategory = {
  /** Match via key.startsWith(prefix), except exact keys listed in CORE_CMDS. */
  prefix: string;
  label: string;
  /** Short blurb for docs/CLI.md section headers. */
  desc: string;
  /** Sort order for interactive help (lower first). */
  priority: number;
};

/** Ordered category matchers (first match wins). Longer/more specific prefixes first when needed. */
export const CLI_CATEGORIES: CliCategory[] = [
  { prefix: 'help', label: 'Help', desc: 'Available commands', priority: -1 },
  {
    prefix: 'packages:',
    label: 'Package Management',
    desc: 'List, check, install deps',
    priority: 0,
  },
  {
    prefix: 'fix:',
    label: 'Antipattern Fixing',
    desc: 'Automated code quality fixes',
    priority: 2,
  },
  { prefix: 'format:', label: 'Format', desc: 'Prettier formatting', priority: 1 },
  { prefix: 'lint:', label: 'Lint', desc: 'ESLint checks', priority: 3 },
  { prefix: 'build:', label: 'Build', desc: 'Build affected packages', priority: 4 },
  { prefix: 'test:', label: 'Test', desc: 'Run tests', priority: 5 },
  { prefix: 'install:', label: 'Install', desc: 'Scoped installs', priority: 6 },
  { prefix: 'dev', label: 'Development', desc: 'Dev servers', priority: 7 },
  { prefix: 'cheatsheet:', label: 'Cheatsheet', desc: 'Generate cheat sheets', priority: 10 },
  { prefix: 'demo:', label: 'Demo', desc: 'Demo contracts', priority: 11 },
  { prefix: 'deploy', label: 'Deploy', desc: 'Deploy helpers', priority: 12 },
  { prefix: 'search:', label: 'Search', desc: 'Search governance and benchmarks', priority: 14 },
  { prefix: 'wiki:', label: 'Wiki', desc: 'Wiki generation and live preview', priority: 15 },
  { prefix: 'markdown', label: 'Markdown', desc: 'Markdown render', priority: 16 },
  {
    prefix: 'profile:barbershop',
    label: 'Barbershop Profile',
    desc: 'Sampling profiler CLI',
    priority: 17,
  },
  { prefix: 'docs:', label: 'Documentation', desc: 'Doc generation', priority: 19 },
  {
    prefix: 'registry:',
    label: 'Registry',
    desc: 'Project / package registry snapshots',
    priority: 20,
  },
  { prefix: 'brand:', label: 'Brands', desc: 'Branded ID tooling', priority: 21 },
  { prefix: 'validate:', label: 'Validate', desc: 'Validation gates', priority: 22 },
  { prefix: 'ci:', label: 'CI', desc: 'CI entrypoints', priority: 23 },
  { prefix: 'security:', label: 'Security', desc: 'Security gates', priority: 24 },
];

/** Human-readable overrides for common scripts. */
export const CLI_SPECIAL: Record<string, string> = {
  dev: 'Start platform watch server (server-enhanced.ts)',
  lint: 'ESLint on lib/',
  format: 'Prettier on lib/',
  help: 'Interactive categorized command list (use --verbose for all)',
  sync: 'Sync integration data',
  updates: 'Check updates',
  docs: 'Generate cheatsheet docs',
  news: 'RSS news feed',
  commits: 'Check commits',
  'pool-telemetry': 'Connection pool telemetry CLI (pass subcommand: stats, query, sync, serve)',
  'security-tests': 'Run lib/security security test suite',
  markdown: 'Render markdown (pass file + format: ansi, html, links, headings, plain)',
  'profile:barbershop': 'Barbershop sampling profiler (pass subcommand: run, quick, status, …)',
  'wiki:mcp': 'Wiki generator MCP CLI (pass subcommand: generate, templates, …)',
  'type-check': 'Day-loop typecheck (tsconfig.check.json)',
  'type-check:ci': 'CI typecheck (tsconfig.ci.json)',
  'type-check:full': 'Full solution typecheck (rare)',
  'build:affected': 'Build packages affected by current changes (bun --filter ...)',
  'test:affected': 'Test packages affected by current changes (bun --filter ...)',
};

/** Always shown under Core in generated docs even without a prefix match. */
export const CLI_CORE_CMDS = new Set([
  'dev',
  'lint',
  'format',
  'help',
  'packages:list',
  'fix:console-log',
  'fix:scan-any-types',
  'fix:scan-default-exports',
  'fix:scan-non-null-assertions',
  'fix:as-any',
  'fix:empty-catches',
  'fix:pin-versions',
  'lint:core',
  'format:core',
  'validate:workspaces',
  'build:affected',
  'test:affected',
  'type-check',
  'cli:docs',
  'registry:projects',
]);

export function matchCliCategory(key: string): { label: string; priority: number } | null {
  for (const cat of CLI_CATEGORIES) {
    if (key.startsWith(cat.prefix)) return { label: cat.label, priority: cat.priority };
  }
  if (key === 'dev') return { label: 'Development', priority: 7 };
  if (CLI_CORE_CMDS.has(key)) return { label: 'Core', priority: -2 };
  return null;
}

export function describeCliScript(key: string, cmd: string, maxLen = 0): string {
  if (CLI_SPECIAL[key]) return CLI_SPECIAL[key]!;
  const desc = cmd
    .replace(/^bun run\s+/, '')
    .replace(/^bun\s+/, '')
    .replace(/&\s*$/, '')
    .trim();
  if (maxLen > 0 && desc.length > maxLen) return `${desc.slice(0, maxLen - 3)}...`;
  return desc;
}

/** Prefixes hidden from non-verbose interactive help. */
export const HELP_QUIET_PREFIXES = ['cheatsheet:', 'demo:'] as const;

export function isHelpQuietKey(key: string, cmd: string): boolean {
  if (HELP_QUIET_PREFIXES.some(p => key.startsWith(p))) return true;
  if (key.startsWith('deploy')) return true;
  if (cmd.startsWith('echo') || cmd.startsWith('//')) return true;
  return false;
}

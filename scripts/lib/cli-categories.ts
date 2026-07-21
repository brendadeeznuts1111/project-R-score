// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
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
  markdown: 'Render markdown (pass file + format: ansi, html, links, headings, plain)',
  'profile:barbershop': 'Barbershop sampling profiler (pass subcommand: run, quick, status, …)',
  'wiki:mcp': 'Wiki generator MCP CLI (pass subcommand: generate, templates, …)',
  'type-check': 'Day-loop typecheck (tsconfig.check.json)',
  'type-check:ci': 'CI typecheck (tsconfig.ci.json)',
  'type-check:full': 'Full solution typecheck (rare)',
  'build:affected': 'Build git-changed workspaces (scripts/affected-workspaces.ts)',
  'test:affected': 'Test git-changed workspaces (scripts/affected-workspaces.ts)',
  'test:changed': 'Bun test --changed (or -- <ref> → --changed=REF)',
  'test:changed:main': 'Bun test --changed via --main-head (origin/main|main|HEAD~1)',
  'test:changed:watch': 'Bun test --changed --watch (stay alive; re-query git each restart)',
  'test:isolate': 'Bun test --isolate (fresh global per file)',
  'test:parallel': 'Bun test --parallel (workers; implies --isolate)',
  'test:shard': 'Bun test --shard=$SHARD (CI split; default 1/1)',
  'check:path-bun': 'Ratchet: no path/node:path imports under lib/',
  'check:bun-env': 'Ratchet: no process.env under lib/ + scripts/',
  'projects:roots:check': 'Ratchet: product-leaf README.md + package.json under projects/',
  'lib:domains:check': 'Ratchet: every first-level lib/*/ has README.md',
  'build:defines':
    'AST build constants (BUILD_VERSION/TIME/COMMIT) + DEBUG DCE via Bun.build/--define',
  'build:defines:dev': 'build:defines with DEBUG=true / --feature=DEBUG',
  'build:defines:compile': 'build:defines --compile → dist/fw-build-info',
  'harness:status': 'Day-loop + ratchet discovery (tool legibility)',
  'docs:harness': 'Render docs/harness/README.md via bun ./file.md (native ANSI, no VM)',
  'docs:cron': 'Cron contract in-terminal (ansiMarkdown · docs/harness/cron.md)',
  'docs:install-verify':
    'Install-verify WebView journey brief (ansiMarkdown · docs/harness/install-verify.md)',
  'docs:fresh-rerun':
    'Fresh-rerun contract + per-claim catalog (ansiMarkdown · docs/harness/FRESH-RERUN.md)',
  'test:cron':
    'Cron contract ratchet (OS-persistent primary / in-process complement · docs/harness/cron.md)',
  'test:install-verify':
    'Install-verify → smoke HTML → Bun.WebView journey (tests/journey/install-verify.test.ts)',
  'spine:schedule': 'Spine integrity daemon (in-process Bun.cron complement)',
  'spine:schedule:once': 'One integrity pass via spine/scheduler → bun-doc-refs',
  'ci:harness':
    'Quiet CI envelope (∥ cheap · eslint-changed · test:changed:main; --full-lint on main)',
  'ci:harness:fast': 'Quiet local parity (∥ cheap · test:changed dirty; no eslint)',
  'ci:core': 'Install verify · hygiene · ci:harness (GHA harness-gates / one install)',
  'lint:bun-native:changed': 'ESLint bun-native on files changed since main-head (cached)',
  'check:pr-claim': 'PR Claim → evidence body check (warn-first → error after 2026-07-28)',
  'proof:install': 'Journey proof: install layout healthy',
  'harness:lesson': 'Scaffold a FEEDBACK.md lesson stub',
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
  'test:changed',
  'test:changed:main',
  'test:changed:watch',
  'test:parallel',
  'type-check',
  'harness:status',
  'docs:harness',
  'docs:cron',
  'docs:install-verify',
  'docs:fresh-rerun',
  'test:cron',
  'test:install-verify',
  'spine:schedule',
  'spine:schedule:once',
  'ci:harness',
  'ci:harness:fast',
  'ci:core',
  'check:pr-claim',
  'proof:install',
  'cli:docs',
  'registry:projects',
  'projects:roots:check',
  'lib:domains:check',
  'build:defines',
  'build:defines:dev',
  'build:defines:compile',
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

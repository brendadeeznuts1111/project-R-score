// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
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
 * @see https://bun.com/docs/runtime — package.json scripts / bun run
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
  'check:path-bun': 'Ratchet: no path/node:path imports under lib/ + tools/',
  'check:bun-env': 'Ratchet: no process.env under lib/ + scripts/',
  'projects:roots:check': 'Ratchet: product-leaf README.md + package.json under projects/',
  'lib:domains:check': 'Ratchet: every first-level lib/*/ has README.md',
  'build:defines':
    'AST build constants (BUILD_VERSION/TIME/COMMIT) + DEBUG DCE via Bun.build/--define',
  'build:defines:dev': 'build:defines with DEBUG=true / --feature=DEBUG',
  'build:defines:compile': 'build:defines --compile → dist/fw-build-info',
  'harness:status': 'Discover (display only): day-loop + proof catalog — not a gate',
  'docs:harness': 'Render docs/harness/README.md via bun ./file.md (native ANSI, no VM)',
  'docs:portal': 'Render docs/portal-foundation.md via bun ./file.md (native ANSI)',
  'portal:theme:check': 'theme-tokens.css stale + portal:colors:check (aliases + floors)',
  'portal:colors:check': 'Color kernel Claim/Evidence (theme-dark aliases · floors)',
  'validate:colors': 'Alias of portal:colors:check — PR paste / --json machine report',
  'test:colors': 'Unit + validate:colors smoke (claim color-kernel-theme-aliases)',
  'docs:cron': 'Cron contract in-terminal (bun ./docs/harness/cron.md)',
  'docs:install-verify':
    'Install-verify WebView journey brief (bun ./docs/harness/install-verify.md)',
  'docs:claim-discovery':
    'Claim discovery questionnaire (new ProofPath · docs/harness/CLAIM-DISCOVERY.md)',
  'docs:spine-tenants': 'Spine tenants index + typed MAINTENANCE_RUNBOOKS catalog',
  'docs:tenant-install-verify':
    'install-verify tenant runbook (signal · intervention · retirement)',
  'docs:tenant-docs-integrity':
    'docs-integrity tenant runbook (signal · intervention · retirement)',
  'test:tenant-runbooks': 'Ratchet: TenantRunbook + heal + code-quality + CI/deploy runbooks',
  'test:tenant-heal': 'E2E heal: break → signal → intervene → recover (sandboxed fixture)',
  'test:code-quality': 'Code-quality tenants: types · harness coverage · orphan modules',
  'test:ci-deploy': 'CI/deploy runbooks + discover-ci coverage ratchet',
  'test:harness-coverage': 'lib/harness coverage floor vs coverage-baseline.json',
  'check:harness-orphans': 'Fail if any lib/harness/*.ts module has no importers',
  'check:harness-complexity':
    'Fail if any lib/harness function exceeds complexity-baseline.json (--update-baseline to raise)',
  'check:harness-complexity:staged':
    'Complexity floor on staged lib/harness files (git diff | Bun.stdin)',
  'test:code-quality:smol': 'test:code-quality under bun --smol (eager GC for tight CI)',
  'docs:code-quality': 'Code-quality tenants index (Bun.markdown.ansi + live catalog)',
  'docs:ci-deploy': 'CI/deploy runbooks index (Bun.markdown.ansi + live catalog)',
  'docs:fresh-rerun':
    'Discover (display only): fresh-rerun contract + catalog — not a gate (Bun.markdown.ansi · FRESH-RERUN.md)',
  'docs:search-governance':
    'Search-governance WebView journey brief (bun ./docs/harness/search-governance.md)',
  'test:cron':
    'Cron contract ratchet (OS-persistent primary / in-process complement · docs/harness/cron.md)',
  'test:cron-os':
    'OS-persistent Bun.cron(path, schedule, title) journey (register → fire → marker → remove)',
  'test:install-verify':
    'Install-verify → smoke HTML → Bun.WebView journey (tests/journey/install-verify.test.ts)',
  'test:search-governance':
    'Search governance → search-smart + WebView type/submit journey (tests/journey/search-governance.test.ts)',
  'spine:schedule': 'Spine multi-tenant daemon (in-process Bun.cron complement)',
  'spine:schedule:once': 'Run spine tenants once (all, or --tenant=install-verify)',
  'ci:harness':
    'Quiet CI envelope (∥ cheap · eslint-changed · test:changed:main; --full-lint on main)',
  'ci:harness:fast': 'Quiet local parity (∥ cheap · test:changed dirty; no eslint)',
  'ci:core': 'Install verify · hygiene · ci:harness (GHA harness-gates / one install)',
  'lint:bun-native:changed': 'ESLint bun-native on files changed since main-head (cached)',
  'check:pr-claim':
    'PR Claim → evidence body check (warn-first → error after 2026-07-28 UTC; --dry-run logs WOULD_*)',
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
  'docs:claim-discovery',
  'docs:spine-tenants',
  'docs:tenant-install-verify',
  'docs:tenant-docs-integrity',
  'docs:fresh-rerun',
  'test:tenant-runbooks',
  'test:tenant-heal',
  'test:code-quality',
  'test:ci-deploy',
  'test:harness-coverage',
  'check:harness-orphans',
  'check:harness-complexity',
  'check:harness-complexity:staged',
  'test:code-quality:smol',
  'docs:code-quality',
  'docs:ci-deploy',
  'docs:search-governance',
  'test:cron',
  'test:cron-os',
  'test:install-verify',
  'test:search-governance',
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
